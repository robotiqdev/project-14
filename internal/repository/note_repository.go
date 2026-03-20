package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"

	"github.com/robotiqdev/project-14/internal/domain"
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
func (r *NoteRepository) DeleteNote(ctx context.Context, id uuid.UUID) error {
	tag, err := r.pool.Exec(ctx, "DELETE FROM notes WHERE id = $1", id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNoteNotFound
	}
	return nil
}
