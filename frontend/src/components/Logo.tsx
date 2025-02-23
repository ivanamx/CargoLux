import { Box } from '@mantine/core';

export function Logo() {
  return (
    <Box 
      style={{ 
        width: '40px', 
        height: '40px',
        borderRadius: '50%',
        background: 'linear-gradient(45deg, #3B82F6, #2563EB)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '2rem'
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    </Box>
  );
}