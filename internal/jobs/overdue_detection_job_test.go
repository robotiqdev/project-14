package jobs_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/project14/task-service/internal/domain/task"
	"github.com/project14/task-service/internal/jobs"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockDetectionService is a testify mock implementing overdue.DetectionServiceInterface.
type MockDetectionService struct {
	mock.Mock
}

func (m *MockDetectionService) DetectOverdueTasks(ctx context.Context, asOf time.Time) ([]task.OverdueTask, error) {
	args := m.Called(ctx, asOf)
	tasks, _ := args.Get(0).([]task.OverdueTask)
	return tasks, args.Error(1)
}

// MockNotificationScheduler is a testify mock implementing jobs.NotificationSchedulerInterface.
type MockNotificationScheduler struct {
	mock.Mock
}

func (m *MockNotificationScheduler) ScheduleNotifications(ctx context.Context, tasks []task.OverdueTask) error {
	args := m.Called(ctx, tasks)
	return args.Error(0)
}

// MockLogger is a testify mock implementing jobs.Logger.
type MockLogger struct {
	mock.Mock
}

func (m *MockLogger) Info(msg string, args ...interface{}) {
	callArgs := []interface{}{msg}
	callArgs = append(callArgs, args...)
	m.Called(callArgs...)
}

func (m *MockLogger) Error(msg string, args ...interface{}) {
	callArgs := []interface{}{msg}
	callArgs = append(callArgs, args...)
	m.Called(callArgs...)
}

func TestOverdueDetectionJob_Run_CallsDetectOverdueTasksWithCurrentUTCTime(t *testing.T) {
	before := time.Now().UTC()

	mockSvc := new(MockDetectionService)
	mockScheduler := new(MockNotificationScheduler)
	mockLogger := new(MockLogger)

	overdueTasks := []task.OverdueTask{
		{TaskID: "task-1", Title: "Overdue Task", DueDate: before.Add(-24 * time.Hour)},
	}

	// Match any time close to now (current UTC time)
	mockSvc.On("DetectOverdueTasks", mock.Anything, mock.MatchedBy(func(asOf time.Time) bool {
		after := time.Now().UTC().Add(time.Second)
		return !asOf.Before(before) && !asOf.After(after)
	})).Return(overdueTasks, nil)
	mockScheduler.On("ScheduleNotifications", mock.Anything, overdueTasks).Return(nil)
	mockLogger.On("Info", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return()

	job := jobs.NewOverdueDetectionJob(mockSvc, mockLogger, mockScheduler)
	err := job.Run(context.Background())

	assert.NoError(t, err)
	mockSvc.AssertExpectations(t)
}

func TestOverdueDetectionJob_Run_LogsAndReturnsErrorOnServiceFailure(t *testing.T) {
	serviceErr := errors.New("database unavailable")

	mockSvc := new(MockDetectionService)
	mockScheduler := new(MockNotificationScheduler)
	mockLogger := new(MockLogger)

	mockSvc.On("DetectOverdueTasks", mock.Anything, mock.AnythingOfType("time.Time")).
		Return(nil, serviceErr)
	mockLogger.On("Error", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return()

	job := jobs.NewOverdueDetectionJob(mockSvc, mockLogger, mockScheduler)
	err := job.Run(context.Background())

	assert.ErrorIs(t, err, serviceErr)
	mockLogger.AssertCalled(t, "Error", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
	mockScheduler.AssertNotCalled(t, "ScheduleNotifications", mock.Anything, mock.Anything)
}

func TestOverdueDetectionJob_Run_RespectsContextCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancel before run

	mockSvc := new(MockDetectionService)
	mockScheduler := new(MockNotificationScheduler)
	mockLogger := new(MockLogger)

	mockSvc.On("DetectOverdueTasks", mock.Anything, mock.AnythingOfType("time.Time")).
		Return(nil, context.Canceled)
	mockLogger.On("Error", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return()

	job := jobs.NewOverdueDetectionJob(mockSvc, mockLogger, mockScheduler)
	err := job.Run(ctx)

	assert.ErrorIs(t, err, context.Canceled)
	mockSvc.AssertExpectations(t)
	mockScheduler.AssertNotCalled(t, "ScheduleNotifications", mock.Anything, mock.Anything)
}

func TestOverdueDetectionJob_Run_PassesDetectedTasksToScheduler(t *testing.T) {
	mockSvc := new(MockDetectionService)
	mockScheduler := new(MockNotificationScheduler)
	mockLogger := new(MockLogger)

	overdueTasks := []task.OverdueTask{
		{TaskID: "task-1", Title: "Task 1", DueDate: time.Now().Add(-24 * time.Hour)},
		{TaskID: "task-2", Title: "Task 2", DueDate: time.Now().Add(-48 * time.Hour)},
	}

	mockSvc.On("DetectOverdueTasks", mock.Anything, mock.AnythingOfType("time.Time")).
		Return(overdueTasks, nil)
	mockScheduler.On("ScheduleNotifications", mock.Anything, overdueTasks).Return(nil)
	mockLogger.On("Info", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return()

	job := jobs.NewOverdueDetectionJob(mockSvc, mockLogger, mockScheduler)
	err := job.Run(context.Background())

	assert.NoError(t, err)
	mockScheduler.AssertCalled(t, "ScheduleNotifications", mock.Anything, overdueTasks)
	mockSvc.AssertExpectations(t)
	mockScheduler.AssertExpectations(t)
}

func TestOverdueDetectionJob_Run_HandlesEmptyOverdueTaskList(t *testing.T) {
	mockSvc := new(MockDetectionService)
	mockScheduler := new(MockNotificationScheduler)
	mockLogger := new(MockLogger)

	mockSvc.On("DetectOverdueTasks", mock.Anything, mock.AnythingOfType("time.Time")).
		Return([]task.OverdueTask{}, nil)
	mockScheduler.On("ScheduleNotifications", mock.Anything, []task.OverdueTask{}).Return(nil)
	mockLogger.On("Info", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return()

	job := jobs.NewOverdueDetectionJob(mockSvc, mockLogger, mockScheduler)
	err := job.Run(context.Background())

	assert.NoError(t, err)
	mockSvc.AssertExpectations(t)
}

func TestOverdueDetectionJob_Run_LogsAndReturnsErrorOnSchedulerFailure(t *testing.T) {
	schedulerErr := errors.New("notification service unavailable")

	mockSvc := new(MockDetectionService)
	mockScheduler := new(MockNotificationScheduler)
	mockLogger := new(MockLogger)

	overdueTasks := []task.OverdueTask{
		{TaskID: "task-1", Title: "Overdue Task"},
	}

	mockSvc.On("DetectOverdueTasks", mock.Anything, mock.AnythingOfType("time.Time")).
		Return(overdueTasks, nil)
	mockScheduler.On("ScheduleNotifications", mock.Anything, overdueTasks).Return(schedulerErr)
	mockLogger.On("Error", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return()

	job := jobs.NewOverdueDetectionJob(mockSvc, mockLogger, mockScheduler)
	err := job.Run(context.Background())

	assert.ErrorIs(t, err, schedulerErr)
	mockLogger.AssertCalled(t, "Error", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
}
