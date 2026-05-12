import ReactMarkdown from 'react-markdown';
import { Box, Typography } from '@mui/material';

const MarkdownAnswer = ({ text = '' }) => {
  return (
    <Box
      sx={{
        '& h1, & h2, & h3': {
          mt: 1.5,
          mb: 1,
          fontWeight: 700,
        },
        '& p': {
          mb: 1,
          lineHeight: 1.7,
        },
        '& ul, & ol': {
          pl: 3,
          mb: 1,
        },
        '& li': {
          mb: 0.5,
          lineHeight: 1.6,
        },
        '& strong': {
          fontWeight: 700,
        },
        '& code': {
          px: 0.5,
          py: 0.2,
          borderRadius: 1,
          bgcolor: 'grey.100',
          fontSize: '0.9em',
        },
      }}
    >
      <Typography component="div" variant="body2">
        <ReactMarkdown>{text}</ReactMarkdown>
      </Typography>
    </Box>
  );
};

export default MarkdownAnswer;