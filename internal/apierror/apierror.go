package apierror

import "net/http"

// APIError represents the JSON error envelope returned by all API endpoints.
type APIError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// Render writes a JSON-encoded APIError to w with the given statusCode and message.
func Render(w http.ResponseWriter, statusCode int, message string) {
	panic("not implemented")
}
