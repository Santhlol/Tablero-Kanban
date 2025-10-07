import React, { useEffect, useState } from 'react';
import { BoardsAPI } from './api/http';
import { BoardPage } from './components/BoardPage';

export default function App() {
  const [boardId, setBoardId] = useState<string | null>(null);
  const [boards, setBoards] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const all = await BoardsAPI.list();
      setBoards(all);
      if (all.length) setBoardId(all[0]._id);
    })();
  }, []);

  if (!boardId) {
    return (
      <div style={{ padding: 20 }}>
        <h3>No hay boards</h3>
        <p>Crea uno con Postman/Thunder Client en <code>POST /api/boards</code> y recarga.</p>
      </div>
    );
  }

  return <BoardPage boardId={boardId} />;
}
