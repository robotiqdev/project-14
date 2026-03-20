package service

import (
	"context"

	"github.com/google/uuid"
)

// NoteDeleter is the repository interface required by NoteService.
type NoteDeleter interface {
	DeleteNote(ctx context.Context, id uuid.UUID) error
}

// NoteService provides business logic for notes.
type NoteService struct {
	repo NoteDeleter
}

// NewNoteService creates a new NoteService backed by the given repository.
func NewNoteService(repo NoteDeleter) *NoteService {
	return &NoteService{repo: repo}
}

// DeleteNote deletes a note by its ID.
func (s *NoteService) DeleteNote(ctx context.Context, id uuid.UUID) error {
	return s.repo.DeleteNote(ctx, id)
}
