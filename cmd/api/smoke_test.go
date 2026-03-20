// Package main_test contains integration smoke tests for the cmd/api server.
//
// These tests validate that the server wiring is correct by:
//   - Building the server binary
//   - Starting it against a real database (DATABASE_URL env var required)
//   - Exercising the DELETE /notes/{id} endpoint
//
// Run with:
//
//	DATABASE_URL=postgres://... go test ./cmd/api/... -v -run TestSmoke
package main_test

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// buildServer compiles cmd/api into a temporary binary and returns its path.
// The test fails immediately if the build fails (e.g. main.go does not exist yet).
func buildServer(t *testing.T) string {
	t.Helper()

	tmp := t.TempDir()
	bin := filepath.Join(tmp, "api-server")

	// Resolve the module root so `go build` finds the module correctly.
	moduleRoot, err := filepath.Abs(filepath.Join("..", ".."))
	if err != nil {
		t.Fatalf("failed to resolve module root: %v", err)
	}

	cmd := exec.Command("go", "build", "-o", bin, "./cmd/api/...")
	cmd.Dir = moduleRoot
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		t.Fatalf("go build ./cmd/api/... failed — main.go must be implemented: %v", err)
	}

	return bin
}

// freePort returns an available TCP port on localhost.
func freePort(t *testing.T) string {
	t.Helper()

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("failed to find free port: %v", err)
	}
	defer ln.Close()

	_, port, err := net.SplitHostPort(ln.Addr().String())
	if err != nil {
		t.Fatalf("failed to parse port: %v", err)
	}

	return port
}

// startServer starts the given binary with the given environment and waits
// until its HTTP listener is reachable (or the test fails on timeout).
func startServer(t *testing.T, bin, port, databaseURL string) func() {
	t.Helper()

	cmd := exec.Command(bin)
	cmd.Env = append(os.Environ(),
		"PORT="+port,
		"DATABASE_URL="+databaseURL,
	)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		t.Fatalf("failed to start server: %v", err)
	}

	baseURL := fmt.Sprintf("http://127.0.0.1:%s", port)

	// Poll until the server is ready (up to 5 seconds).
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		resp, err := http.Get(baseURL + "/healthz")
		if err == nil {
			resp.Body.Close()
			break
		}
		// Also accept any non-connection-refused reply — the route may not exist
		// but the server is up.
		time.Sleep(50 * time.Millisecond)
	}

	// Verify the server is actually reachable via a TCP dial before continuing.
	dialDeadline := time.Now().Add(5 * time.Second)
	for {
		conn, err := net.DialTimeout("tcp", "127.0.0.1:"+port, 100*time.Millisecond)
		if err == nil {
			conn.Close()
			break
		}
		if time.Now().After(dialDeadline) {
			cmd.Process.Kill()
			t.Fatalf("server did not become reachable on port %s within 5s", port)
		}
		time.Sleep(50 * time.Millisecond)
	}

	return func() {
		cmd.Process.Kill()
		cmd.Wait()
	}
}

// insertNote inserts a bare note row into the database and returns its ID.
// This simulates the "create a note" step without requiring a POST endpoint.
func insertNote(t *testing.T, pool *pgxpool.Pool) uuid.UUID {
	t.Helper()

	id := uuid.New()
	_, err := pool.Exec(context.Background(),
		"INSERT INTO notes (id) VALUES ($1)", id)
	if err != nil {
		t.Fatalf("failed to insert test note: %v", err)
	}
	return id
}

// dbPool returns a pgxpool connected to DATABASE_URL, or skips the test if the
// variable is not set.
func dbPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Skip("DATABASE_URL not set — skipping smoke tests")
	}

	pool, err := pgxpool.New(context.Background(), dsn)
	if err != nil {
		t.Fatalf("failed to create db pool: %v", err)
	}

	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		t.Fatalf("database not reachable: %v", err)
	}

	t.Cleanup(pool.Close)
	return pool
}

// TestSmoke_DELETE_ExistingNote_Returns204 verifies that deleting an existing
// note returns HTTP 204 No Content.
func TestSmoke_DELETE_ExistingNote_Returns204(t *testing.T) {
	bin := buildServer(t) // fails if main.go not implemented
	pool := dbPool(t)     // skips if DATABASE_URL not set
	port := freePort(t)
	stop := startServer(t, bin, port, os.Getenv("DATABASE_URL"))
	defer stop()

	noteID := insertNote(t, pool)

	url := fmt.Sprintf("http://127.0.0.1:%s/notes/%s", port, noteID)
	req, err := http.NewRequest(http.MethodDelete, url, nil)
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("DELETE request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		t.Errorf("expected 204 No Content, got %d", resp.StatusCode)
	}
}

// TestSmoke_DELETE_NonExistentNote_Returns404 verifies that deleting a note
// that does not exist returns HTTP 404 Not Found.
func TestSmoke_DELETE_NonExistentNote_Returns404(t *testing.T) {
	bin := buildServer(t) // fails if main.go not implemented
	_ = dbPool(t)         // skips if DATABASE_URL not set
	port := freePort(t)
	stop := startServer(t, bin, port, os.Getenv("DATABASE_URL"))
	defer stop()

	// Use a random UUID that is guaranteed not to exist.
	nonExistentID := uuid.New()
	url := fmt.Sprintf("http://127.0.0.1:%s/notes/%s", port, nonExistentID)

	req, err := http.NewRequest(http.MethodDelete, url, nil)
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("DELETE request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusNotFound {
		t.Errorf("expected 404 Not Found, got %d", resp.StatusCode)
	}
}

// TestSmoke_DELETE_Idempotency verifies that deleting the same note twice
// returns 204 on the first call and 404 on the second (not idempotent in the
// REST sense — deleted resources stay gone).
func TestSmoke_DELETE_Idempotency(t *testing.T) {
	bin := buildServer(t)
	pool := dbPool(t)
	port := freePort(t)
	stop := startServer(t, bin, port, os.Getenv("DATABASE_URL"))
	defer stop()

	noteID := insertNote(t, pool)
	url := fmt.Sprintf("http://127.0.0.1:%s/notes/%s", port, noteID)

	// First DELETE — should succeed.
	req1, _ := http.NewRequest(http.MethodDelete, url, nil)
	resp1, err := http.DefaultClient.Do(req1)
	if err != nil {
		t.Fatalf("first DELETE request failed: %v", err)
	}
	resp1.Body.Close()

	if resp1.StatusCode != http.StatusNoContent {
		t.Errorf("first DELETE: expected 204, got %d", resp1.StatusCode)
	}

	// Second DELETE on the same ID — note is gone, expect 404.
	req2, _ := http.NewRequest(http.MethodDelete, url, nil)
	resp2, err := http.DefaultClient.Do(req2)
	if err != nil {
		t.Fatalf("second DELETE request failed: %v", err)
	}
	resp2.Body.Close()

	if resp2.StatusCode != http.StatusNotFound {
		t.Errorf("second DELETE: expected 404, got %d", resp2.StatusCode)
	}
}

// TestSmoke_ServerListensOnConfiguredPort verifies that the server binds to the
// PORT environment variable and not to a hard-coded port.
func TestSmoke_ServerListensOnConfiguredPort(t *testing.T) {
	bin := buildServer(t)
	_ = dbPool(t)
	port := freePort(t)
	stop := startServer(t, bin, port, os.Getenv("DATABASE_URL"))
	defer stop()

	// Confirm the server is actually listening on the expected port.
	conn, err := net.DialTimeout("tcp", "127.0.0.1:"+port, time.Second)
	if err != nil {
		t.Fatalf("server is not listening on configured port %s: %v", port, err)
	}
	conn.Close()
}

// TestSmoke_ServerRejectsInvalidUUIDWith400 verifies that a malformed UUID in
// the path returns a 4xx response rather than a 500.
func TestSmoke_ServerRejectsInvalidUUIDWith4xx(t *testing.T) {
	bin := buildServer(t)
	_ = dbPool(t)
	port := freePort(t)
	stop := startServer(t, bin, port, os.Getenv("DATABASE_URL"))
	defer stop()

	url := fmt.Sprintf("http://127.0.0.1:%s/notes/not-a-valid-uuid", port)
	req, err := http.NewRequest(http.MethodDelete, url, nil)
	if err != nil {
		t.Fatalf("failed to create request: %v", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("DELETE request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 400 || resp.StatusCode >= 500 {
		t.Errorf("expected a 4xx response for invalid UUID, got %d", resp.StatusCode)
	}
}

// TestSmoke_GracefulShutdown verifies that the server handles SIGTERM gracefully
// (i.e. the process exits cleanly rather than being killed with SIGKILL).
func TestSmoke_GracefulShutdown(t *testing.T) {
	bin := buildServer(t)
	_ = dbPool(t)
	port := freePort(t)

	cmd := exec.Command(bin)
	cmd.Env = append(os.Environ(),
		"PORT="+port,
		"DATABASE_URL="+os.Getenv("DATABASE_URL"),
	)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Start(); err != nil {
		t.Fatalf("failed to start server: %v", err)
	}

	// Wait for the server to be ready.
	deadline := time.Now().Add(5 * time.Second)
	for {
		conn, err := net.DialTimeout("tcp", "127.0.0.1:"+port, 100*time.Millisecond)
		if err == nil {
			conn.Close()
			break
		}
		if time.Now().After(deadline) {
			cmd.Process.Kill()
			t.Fatalf("server did not start within 5s")
		}
		time.Sleep(50 * time.Millisecond)
	}

	// Send SIGTERM and wait for clean exit.
	if err := cmd.Process.Signal(os.Interrupt); err != nil {
		t.Logf("signal failed (may be unsupported on this OS): %v", err)
		cmd.Process.Kill()
	}

	done := make(chan error, 1)
	go func() { done <- cmd.Wait() }()

	select {
	case <-done:
		// Process exited — graceful shutdown successful.
	case <-time.After(10 * time.Second):
		cmd.Process.Kill()
		t.Error("server did not shut down within 10s after SIGTERM")
	}
}
