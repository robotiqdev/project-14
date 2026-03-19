package overdue_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/project14/task-service/internal/domain/task"
	"github.com/project14/task-service/internal/services/overdue"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockOverdueTaskRepository is a testify mock implementing task.OverdueTaskRepository.
type MockOverdueTaskRepository struct {
	mock.Mock
}

func (m *MockOverdueTaskRepository) FindOverdueTasks(ctx context.Context, asOf time.Time) ([]task.OverdueTask, error) {
	args := m.Called(ctx, asOf)
	tasks, _ := args.Get(0).([]task.OverdueTask)
	return tasks, args.Error(1)
}

func TestDetectionService_DetectOverdueTasks_ReturnsOverdueTasks(t *testing.T) {
	asOf := time.Date(2026, 3, 19, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name          string
		repoTasks     []task.OverdueTask
		repoErr       error
		expectedTasks []task.OverdueTask
		expectedErr   error
	}{
		{
			name: "tasks with due_date before asOf and non-terminal status are returned as overdue",
			repoTasks: []task.OverdueTask{
				{
					TaskID:     "task-1",
					Title:      "Past Due Task",
					DueDate:    asOf.Add(-24 * time.Hour),
					AssigneeID: "user-1",
					AssigneeTZ: "America/New_York",
					TeamLeadID: "lead-1",
					TeamLeadTZ: "America/Chicago",
					TeamID:     "team-1",
				},
				{
					TaskID:     "task-2",
					Title:      "Another Past Due Task",
					DueDate:    asOf.Add(-1 * time.Hour),
					AssigneeID: "user-2",
					AssigneeTZ: "Europe/London",
					TeamLeadID: "lead-2",
					TeamLeadTZ: "Europe/Paris",
					TeamID:     "team-2",
				},
			},
			repoErr: nil,
			expectedTasks: []task.OverdueTask{
				{
					TaskID:     "task-1",
					Title:      "Past Due Task",
					DueDate:    asOf.Add(-24 * time.Hour),
					AssigneeID: "user-1",
					AssigneeTZ: "America/New_York",
					TeamLeadID: "lead-1",
					TeamLeadTZ: "America/Chicago",
					TeamID:     "team-1",
				},
				{
					TaskID:     "task-2",
					Title:      "Another Past Due Task",
					DueDate:    asOf.Add(-1 * time.Hour),
					AssigneeID: "user-2",
					AssigneeTZ: "Europe/London",
					TeamLeadID: "lead-2",
					TeamLeadTZ: "Europe/Paris",
					TeamID:     "team-2",
				},
			},
			expectedErr: nil,
		},
		{
			name:          "tasks with due_date equal to asOf are NOT overdue — repo returns empty",
			repoTasks:     []task.OverdueTask{},
			repoErr:       nil,
			expectedTasks: []task.OverdueTask{},
			expectedErr:   nil,
		},
		{
			name:          "tasks already archived or done are excluded — repo returns empty",
			repoTasks:     []task.OverdueTask{},
			repoErr:       nil,
			expectedTasks: []task.OverdueTask{},
			expectedErr:   nil,
		},
		{
			name:          "repository error propagates to caller",
			repoTasks:     nil,
			repoErr:       errors.New("database connection failed"),
			expectedTasks: nil,
			expectedErr:   errors.New("database connection failed"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := new(MockOverdueTaskRepository)
			mockRepo.On("FindOverdueTasks", mock.Anything, asOf).Return(tt.repoTasks, tt.repoErr)

			svc := overdue.NewDetectionService(mockRepo)
			result, err := svc.DetectOverdueTasks(context.Background(), asOf)

			if tt.expectedErr != nil {
				assert.EqualError(t, err, tt.expectedErr.Error())
			} else {
				assert.NoError(t, err)
			}

			assert.Equal(t, tt.expectedTasks, result)
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestDetectionService_DetectOverdueTasks_CallsRepoWithProvidedAsOf(t *testing.T) {
	asOf := time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)

	mockRepo := new(MockOverdueTaskRepository)
	mockRepo.On("FindOverdueTasks", mock.Anything, asOf).Return([]task.OverdueTask{}, nil)

	svc := overdue.NewDetectionService(mockRepo)
	_, _ = svc.DetectOverdueTasks(context.Background(), asOf)

	mockRepo.AssertCalled(t, "FindOverdueTasks", mock.Anything, asOf)
}

func TestDetectionService_DetectOverdueTasks_PropagatesContext(t *testing.T) {
	asOf := time.Now().UTC()
	ctx, cancel := context.WithCancel(context.Background())
	cancel() // already cancelled

	mockRepo := new(MockOverdueTaskRepository)
	mockRepo.On("FindOverdueTasks", mock.Anything, asOf).Return(nil, context.Canceled)

	svc := overdue.NewDetectionService(mockRepo)
	result, err := svc.DetectOverdueTasks(ctx, asOf)

	assert.ErrorIs(t, err, context.Canceled)
	assert.Nil(t, result)
	mockRepo.AssertExpectations(t)
}

func TestDetectionService_DetectOverdueTasks_ReturnsAllFieldsFromRepo(t *testing.T) {
	asOf := time.Date(2026, 3, 19, 12, 0, 0, 0, time.UTC)
	expected := task.OverdueTask{
		TaskID:     "task-complete",
		Title:      "Full Field Task",
		DueDate:    asOf.Add(-48 * time.Hour),
		AssigneeID: "assignee-uuid",
		AssigneeTZ: "Asia/Tokyo",
		TeamLeadID: "lead-uuid",
		TeamLeadTZ: "Asia/Seoul",
		TeamID:     "team-uuid",
	}

	mockRepo := new(MockOverdueTaskRepository)
	mockRepo.On("FindOverdueTasks", mock.Anything, asOf).Return([]task.OverdueTask{expected}, nil)

	svc := overdue.NewDetectionService(mockRepo)
	result, err := svc.DetectOverdueTasks(context.Background(), asOf)

	assert.NoError(t, err)
	assert.Len(t, result, 1)
	assert.Equal(t, expected, result[0])
	mockRepo.AssertExpectations(t)
}

// Verify DetectionService implements DetectionServiceInterface at compile time.
var _ overdue.DetectionServiceInterface = (*overdue.DetectionService)(nil)
