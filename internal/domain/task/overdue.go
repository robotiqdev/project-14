package task

import (
	"context"
	"time"
)

// OverdueTask is a read-only projection/DTO representing a task that is past its due date.
type OverdueTask struct {
	TaskID     string
	Title      string
	DueDate    time.Time
	AssigneeID string
	AssigneeTZ string
	TeamLeadID string
	TeamLeadTZ string
	TeamID     string
}

// OverdueTaskRepository defines the persistence interface for querying overdue tasks.
type OverdueTaskRepository interface {
	FindOverdueTasks(ctx context.Context, asOf time.Time) ([]OverdueTask, error)
}
