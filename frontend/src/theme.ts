import { createTheme } from '@mui/material/styles';

// BigStu Bets — Dark Theme
const theme = createTheme({
    palette: {
        mode: 'dark',
        background: {
            default: '#020617',  // --fb-bg-deep (Slate 950)
            paper: '#0F172A',    // --fb-bg-surface (Slate 900)
        },
        text: {
            primary: '#F8FAFC',   // --fb-text-primary (Slate 50)
            secondary: '#94A3B8', // --fb-text-secondary (Slate 400)
            disabled: '#64748B',  // --fb-text-muted (Slate 500)
        },
        primary: {
            main: '#22C55E',  // --fb-accent (Emerald 500)
            dark: '#16A34A',  // --fb-accent-dim (Emerald 600)
            contrastText: '#ffffff',
        },
        error: { main: '#EF4444' },    // --fb-danger
        warning: { main: '#F59E0B' },  // --fb-warning
        info: { main: '#3B82F6' },     // --fb-info
        divider: 'rgba(255,255,255,0.1)', // --fb-border
    },
    typography: {
        fontFamily: '"Space Mono", monospace',
        h1: { fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const },
        h2: { fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const },
        h3: { fontWeight: 700, letterSpacing: '0.05em' },
        h4: { fontWeight: 700, letterSpacing: '0.05em' },
        h5: { fontWeight: 700 },
        h6: { fontWeight: 700 },
        body1: { fontWeight: 400 },
        body2: { fontWeight: 400 },
        caption: { fontWeight: 400, letterSpacing: '0.15em', textTransform: 'uppercase' as const },
        button: { fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' as const },
    },
    shape: {
        borderRadius: 16,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: 'none',
                    padding: '10px 20px',
                    '&:hover': {
                        boxShadow: 'none',
                    },
                },
                containedPrimary: {
                    backgroundColor: '#22C55E',
                    color: '#ffffff',
                    '&:hover': {
                        backgroundColor: '#16A34A',
                    },
                },
                outlined: {
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: '#F8FAFC',
                    '&:hover': {
                        borderColor: 'rgba(255,255,255,0.2)',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                    },
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    backgroundColor: '#0F172A',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: 'none',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: 'rgba(2,6,23,0.8)',
                    backdropFilter: 'blur(16px)',
                    color: '#F8FAFC',
                    boxShadow: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#0F172A',
                    borderRight: '1px solid rgba(255,255,255,0.1)',
                },
            },
        },
        MuiListItemButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    margin: '4px 8px',
                    '&.Mui-selected': {
                        backgroundColor: '#1E293B', // Slate 800
                        color: '#F8FAFC',
                        '&:hover': {
                            backgroundColor: '#334155', // Slate 700
                        },
                    },
                    '&:hover': {
                        backgroundColor: '#0F172A', // Slate 900
                    },
                },
            },
        },
    },
});

export default theme;
