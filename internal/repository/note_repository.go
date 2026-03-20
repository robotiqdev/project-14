package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
)

// PgxPool is the minimal interface required by NoteRepository for database access.
type PgxPool interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
}

// NoteRepository handles persistence operations for notes.
type NoteRepository struct {
	pool PgxPool
}

// NewNoteRepository creates a new NoteRepository backed by the given pool.
func NewNoteRepository(pool PgxPool) *NoteRepository {
	return &NoteRepository{pool: pool}
}

// DeleteNote removes a note by its ID.
// TODO: implementation to be added in TASK-1243-004.
func (r *NoteRepository) DeleteNote(ctx context.Context, id uuid.UUID) error {
	return errors.New("DeleteNote: not implemented")
}
