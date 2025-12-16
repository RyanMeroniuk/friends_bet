import { createTheme } from '@mui/material/styles';

// Modern Slate & Steel Palette
const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#334155', // Slate 700 (Steel)
            light: '#64748b', // Slate 500
            dark: '#0f172a', // Slate 900
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#94a3b8', // Slate 400
            light: '#cbd5e1', // Slate 300
            dark: '#475569', // Slate 600
            contrastText: '#ffffff',
        },
        background: {
            default: '#f8fafc', // Slate 50
            paper: '#ffffff',
        },
        text: {
            primary: '#1e293b', // Slate 800
            secondary: '#64748b', // Slate 500
        },
        divider: '#e2e8f0', // Slate 200
    },
    typography: {
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        h1: { fontWeight: 700, letterSpacing: '-0.02em' },
        h2: { fontWeight: 700, letterSpacing: '-0.01em' },
        h3: { fontWeight: 600 },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: {
        borderRadius: 16, // Modern rounded look
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: 'none',
                    padding: '10px 20px',
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(51, 65, 85, 0.15)',
                        backgroundColor: '#1e293b',
                    },
                },
                containedPrimary: {
                    backgroundColor: '#334155',
                    '&:hover': {
                        backgroundColor: '#1e293b',
                    },
                },
                outlined: {
                    borderColor: '#e2e8f0',
                    color: '#334155',
                    '&:hover': {
                        borderColor: '#cbd5e1',
                        backgroundColor: '#f1f5f9',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
                },
                elevation1: {
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(16px)',
                    color: '#1e293b',
                    boxShadow: 'none',
                    borderBottom: '1px solid #e2e8f0',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#f8fafc',
                    borderRight: '1px solid #e2e8f0',
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    margin: '4px 8px',
                    '&.Mui-selected': {
                        backgroundColor: '#e2e8f0',
                        color: '#0f172a',
                        '&:hover': {
                            backgroundColor: '#cbd5e1',
                        },
                    },
                    '&:hover': {
                        backgroundColor: '#f1f5f9',
                    },
                },
            },
        },
    },
});

export default theme;
