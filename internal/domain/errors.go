package domain

import "errors"

// ErrNoteNotFound is returned when a note does not exist in the database.
var ErrNoteNotFound = errors.New("note not found")
