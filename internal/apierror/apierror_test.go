package apierror_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/robotiqdev/project-14/internal/apierror"
)

func TestRender_StatusCode(t *testing.T) {
	rr := httptest.NewRecorder()
	apierror.Render(rr, http.StatusNotFound, "not found")

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected status code %d, got %d", http.StatusNotFound, rr.Code)
	}
}

func TestRender_ResponseBodyFields(t *testing.T) {
	rr := httptest.NewRecorder()
	apierror.Render(rr, http.StatusBadRequest, "invalid input")

	var result apierror.APIError
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}

	if result.Code != http.StatusBadRequest {
		t.Errorf("expected Code %d, got %d", http.StatusBadRequest, result.Code)
	}
	if result.Message != "invalid input" {
		t.Errorf("expected Message %q, got %q", "invalid input", result.Message)
	}
}

func TestRender_ContentTypeHeader(t *testing.T) {
	rr := httptest.NewRecorder()
	apierror.Render(rr, http.StatusInternalServerError, "internal error")

	ct := rr.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("expected Content-Type %q, got %q", "application/json", ct)
	}
}

func TestRender_InternalServerError(t *testing.T) {
	rr := httptest.NewRecorder()
	apierror.Render(rr, http.StatusInternalServerError, "something went wrong")

	if rr.Code != http.StatusInternalServerError {
		t.Errorf("expected status code %d, got %d", http.StatusInternalServerError, rr.Code)
	}

	var result apierror.APIError
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}

	if result.Code != http.StatusInternalServerError {
		t.Errorf("expected Code %d, got %d", http.StatusInternalServerError, result.Code)
	}
	if result.Message != "something went wrong" {
		t.Errorf("expected Message %q, got %q", "something went wrong", result.Message)
	}
}

func TestRender_UnauthorizedError(t *testing.T) {
	rr := httptest.NewRecorder()
	apierror.Render(rr, http.StatusUnauthorized, "unauthorized")

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected status code %d, got %d", http.StatusUnauthorized, rr.Code)
	}

	var result apierror.APIError
	if err := json.NewDecoder(rr.Body).Decode(&result); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}

	if result.Code != http.StatusUnauthorized {
		t.Errorf("expected Code %d, got %d", http.StatusUnauthorized, result.Code)
	}
	if result.Message != "unauthorized" {
		t.Errorf("expected Message %q, got %q", "unauthorized", result.Message)
	}
}
