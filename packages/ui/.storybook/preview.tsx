import type { Preview } from '@storybook/react';
import '../src/index.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: '#0D0D0F',
        },
        {
          name: 'light',
          value: '#F5F5F7',
        },
      ],
    },
  },
  decorators: [
    (Story, context) => {
      const direction = context.globals.direction || 'rtl';
      return (
        <div dir={direction} style={{ display: 'flex', gap: '20px', padding: '20px', flexWrap: 'wrap' }}>
          <Story />
        </div>
      );
    },
  ],
  globalTypes: {
    direction: {
      name: 'Direction',
      description: 'Direction for layout',
      defaultValue: 'rtl',
      toolbar: {
        icon: 'globe',
        items: ['ltr', 'rtl'],
      },
    },
  },
};

export default preview;
