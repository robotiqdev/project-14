package handler

import (
	"context"
	"errors"
	"net/http"

	"github.com/google/uuid"

	"github.com/robotiqdev/project-14/internal/apierror"
	"github.com/robotiqdev/project-14/internal/domain"
)

// NoteService is the interface required by the handler layer.
type NoteService interface {
	DeleteNote(ctx context.Context, id uuid.UUID) error
}

// NoteHandler handles HTTP requests for notes.
type NoteHandler struct {
	svc NoteService
}

// NewRouter creates an http.Handler with all note routes registered.
func NewRouter(svc NoteService) http.Handler {
	h := &NoteHandler{svc: svc}
	mux := http.NewServeMux()
	mux.HandleFunc("DELETE /notes/{id}", h.deleteNote)
	return mux
}

func (h *NoteHandler) deleteNote(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		apierror.Render(w, http.StatusBadRequest, "invalid note ID")
		return
	}

	if err := h.svc.DeleteNote(r.Context(), id); err != nil {
		if errors.Is(err, domain.ErrNoteNotFound) {
			apierror.Render(w, http.StatusNotFound, "note not found")
			return
		}
		apierror.Render(w, http.StatusInternalServerError, "internal server error")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
