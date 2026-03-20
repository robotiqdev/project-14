package repository_test

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	pgxmock "github.com/pashagolub/pgxmock/v3"

	"github.com/robotiqdev/project-14/internal/domain"
	"github.com/robotiqdev/project-14/internal/repository"
)

// TestDeleteNote_Success verifies that DeleteNote returns nil when the row is deleted.
func TestDeleteNote_Success(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgxmock pool: %v", err)
	}

	id := uuid.New()

	mock.ExpectExec(`DELETE FROM notes WHERE id = \$1`).
		WithArgs(id).
		WillReturnResult(pgxmock.NewResult("DELETE", 1))

	repo := repository.NewNoteRepository(mock)

	err = repo.DeleteNote(context.Background(), id)
	if err != nil {
		t.Errorf("expected no error, got: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled mock expectations: %v", err)
	}
}

// TestDeleteNote_NotFound verifies that DeleteNote returns domain.ErrNoteNotFound
// when no row is affected by the DELETE statement.
func TestDeleteNote_NotFound(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgxmock pool: %v", err)
	}

	id := uuid.New()

	mock.ExpectExec(`DELETE FROM notes WHERE id = \$1`).
		WithArgs(id).
		WillReturnResult(pgxmock.NewResult("DELETE", 0))

	repo := repository.NewNoteRepository(mock)

	err = repo.DeleteNote(context.Background(), id)
	if err == nil {
		t.Error("expected an error, got nil")
	}

	if !errors.Is(err, domain.ErrNoteNotFound) {
		t.Errorf("expected domain.ErrNoteNotFound, got: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled mock expectations: %v", err)
	}
}

// TestDeleteNote_DBError verifies that DeleteNote propagates database errors and does
// NOT wrap them as domain.ErrNoteNotFound.
func TestDeleteNote_DBError(t *testing.T) {
	mock, err := pgxmock.NewPool()
	if err != nil {
		t.Fatalf("failed to create pgxmock pool: %v", err)
	}

	id := uuid.New()
	dbErr := errors.New("connection reset by peer")

	mock.ExpectExec(`DELETE FROM notes WHERE id = \$1`).
		WithArgs(id).
		WillReturnError(dbErr)

	repo := repository.NewNoteRepository(mock)

	err = repo.DeleteNote(context.Background(), id)
	if err == nil {
		t.Error("expected an error, got nil")
	}

	if errors.Is(err, domain.ErrNoteNotFound) {
		t.Errorf("expected a raw DB error, but got domain.ErrNoteNotFound")
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Errorf("unfulfilled mock expectations: %v", err)
	}
}
