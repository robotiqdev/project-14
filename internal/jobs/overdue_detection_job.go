package jobs

import (
	"context"
	"time"

	"github.com/project14/task-service/internal/domain/task"
	"github.com/project14/task-service/internal/services/overdue"
)

// Logger defines the logging interface used by the job.
type Logger interface {
	Info(msg string, args ...interface{})
	Error(msg string, args ...interface{})
}

// NotificationSchedulerInterface defines the contract for scheduling notifications.
type NotificationSchedulerInterface interface {
	ScheduleNotifications(ctx context.Context, tasks []task.OverdueTask) error
}

// OverdueDetectionJob is a cron job that detects overdue tasks and schedules notifications.
type OverdueDetectionJob struct {
	service   overdue.DetectionServiceInterface
	logger    Logger
	scheduler NotificationSchedulerInterface
}

// NewOverdueDetectionJob creates a new OverdueDetectionJob.
func NewOverdueDetectionJob(
	service overdue.DetectionServiceInterface,
	logger Logger,
	scheduler NotificationSchedulerInterface,
) *OverdueDetectionJob {
	return &OverdueDetectionJob{
		service:   service,
		logger:    logger,
		scheduler: scheduler,
	}
}

// Run executes the overdue detection job: detects overdue tasks and passes them to the scheduler.
func (j *OverdueDetectionJob) Run(ctx context.Context) error {
	panic("not implemented")
}

// ensure time is imported (used by callers)
var _ = time.Now
