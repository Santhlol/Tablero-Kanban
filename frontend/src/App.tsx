import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LandingRoute } from './routes/LandingRoute';
import { BoardRoute } from './routes/BoardRoute';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/boards/:boardId" element={<BoardRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
