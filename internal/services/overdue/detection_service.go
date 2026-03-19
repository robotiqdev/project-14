package overdue

import (
	"context"
	"time"

	"github.com/project14/task-service/internal/domain/task"
)

// DetectionServiceInterface defines the contract for overdue task detection.
type DetectionServiceInterface interface {
	DetectOverdueTasks(ctx context.Context, asOf time.Time) ([]task.OverdueTask, error)
}

// DetectionService detects overdue tasks by querying the repository.
type DetectionService struct {
	repo task.OverdueTaskRepository
}

// NewDetectionService creates a new DetectionService with the given repository.
func NewDetectionService(repo task.OverdueTaskRepository) *DetectionService {
	return &DetectionService{repo: repo}
}

// DetectOverdueTasks returns all tasks that are overdue as of the given time.
// Tasks with due_date < asOf and status NOT IN ('done','archived','cancelled') are returned.
func (s *DetectionService) DetectOverdueTasks(ctx context.Context, asOf time.Time) ([]task.OverdueTask, error) {
	return s.repo.FindOverdueTasks(ctx, asOf)
}
