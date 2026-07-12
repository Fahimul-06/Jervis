import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider, useAuth } from './lib/auth';
import { AuthScreen } from './components/AuthScreen';

function Root(){ const {user,loading}=useAuth(); if(loading) return <div className='min-h-screen bg-slate-950 text-white flex items-center justify-center'>Loading JERVIS…</div>; return user?<App/>:<AuthScreen/>; }
createRoot(document.getElementById('root')!).render(<StrictMode><AuthProvider><Root/></AuthProvider></StrictMode>);
