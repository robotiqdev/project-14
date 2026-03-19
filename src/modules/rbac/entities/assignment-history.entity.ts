import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('assignment_history')
@Index(['taskId', 'assignedAt'])
@Index(['assigneeId'])
@Index(['unassignedAt'])
export class AssignmentHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  taskId: string;

  @Column({ type: 'uuid' })
  assigneeId: string;

  @Column({ type: 'uuid' })
  assignedById: string;

  @Column({ type: 'timestamptz' })
  assignedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  unassignedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  unassignedById: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
