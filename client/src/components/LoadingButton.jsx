import { Button, CircularProgress } from '@mui/material';

const LoadingButton = ({ children, loading, disabled, ...props }) => {
  return (
    <Button variant="contained" disabled={loading || disabled} {...props}>
      {loading ? <CircularProgress size={20} color="inherit" /> : children}
    </Button>
  );
};

export default LoadingButton;
