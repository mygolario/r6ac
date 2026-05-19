import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './badge';
import React from 'react';

const meta = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Variants: Story = {
  render: () => (
    <div className="flex gap-4">
      <Badge variant="clean">Clean</Badge>
      <Badge variant="flagged">Flagged</Badge>
      <Badge variant="banned">Banned</Badge>
      <Badge variant="neutral">Neutral</Badge>
    </div>
  ),
};

export const RTL: Story = {
  parameters: {
    direction: 'rtl',
  },
  render: () => (
    <div className="flex gap-4" dir="rtl">
      <Badge variant="clean">پاک</Badge>
      <Badge variant="flagged">مشکوک</Badge>
      <Badge variant="banned">مسدود</Badge>
    </div>
  ),
};
