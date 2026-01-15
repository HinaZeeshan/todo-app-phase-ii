import React, { memo } from 'react';
import { TodoItem } from '../../../frontend/types';
import TaskCard from './TaskCard';

interface TaskListProps {
  tasks: TodoItem[];
}

const TaskList: React.FC<TaskListProps> = ({ tasks }) => {
  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
};

export default memo(TaskList);