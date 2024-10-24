import React, { useState, useEffect, useRef } from 'react';
import Modal from 'react-modal';
import { FaSearch, FaDraftingCompass } from 'react-icons/fa';
import './styles/BlueprintViewerStyles.css';


// Función para obtener los blueprints desde la API
const fetchBlueprints = async (author, setBlueprints, setSelectedBlueprint) => {
  try {
    const url = author ? `http://localhost:8080/blueprints/${author}` : 'http://localhost:8080/blueprints';
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch blueprints');
    const data = await response.json();
    setBlueprints(data);
    setSelectedBlueprint(null);
  } catch (error) {
    console.error('Error fetching blueprints:', error);
    setBlueprints([]);
  }
};

// Función para dibujar el blueprint en el canvas del modal
const drawBlueprint = (blueprint, canvasRef) => {
  const canvas = canvasRef.current;
  if (!canvas || !blueprint) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpiar el canvas

  if (blueprint.points.length === 0) return; // Dibujar blueprint
  const margin = 20;
  const xValues = blueprint.points.map(p => p.x);
  const yValues = blueprint.points.map(p => p.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const scaleX = (canvas.width - 2 * margin) / (maxX - minX || 1);
  const scaleY = (canvas.height - 2 * margin) / (maxY - minY || 1);
  const scale = Math.min(scaleX, scaleY);

  const transformCoord = (coord, min, scale) => (coord - min) * scale + margin;

  ctx.beginPath();
  ctx.moveTo(
    transformCoord(blueprint.points[0].x, minX, scale),
    transformCoord(blueprint.points[0].y, minY, scale)
  );
  for (let i = 1; i < blueprint.points.length; i++) {
    ctx.lineTo(
      transformCoord(blueprint.points[i].x, minX, scale),
      transformCoord(blueprint.points[i].y, minY, scale)
    );
  }
  ctx.strokeStyle = '#3498db';
  ctx.lineWidth = 2;
  ctx.stroke();

  blueprint.points.forEach((point, index) => {
    ctx.beginPath();
    ctx.arc(
      transformCoord(point.x, minX, scale),
      transformCoord(point.y, minY, scale),
      3, 0, 2 * Math.PI
    );
    ctx.fillStyle = index === 0 ? '#2ecc71' : '#e74c3c';
    ctx.fill();
  });
};

// Función para manejar los clics del usuario en el canvas interactivo
const handleUserCanvasClick = (e, userCanvasRef, drawnPoints, setDrawnPoints, drawUserPoints, selectedBlueprint) => {
  if (!selectedBlueprint) {
    alert('Debes seleccionar un blueprint');
    return;
  }

  const canvas = userCanvasRef.current;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  alert(`pointerdown at ${x}, ${y}`);
  const newPoint = { x, y };

  setDrawnPoints((prevPoints) => {
    const updatedPoints = [...prevPoints, newPoint];
    drawUserPoints(updatedPoints, userCanvasRef);
    return updatedPoints;
  });
  
};

// Función para actualizar y guardar el blueprint
const saveUpdateBluePrint = async (e, drawnPoints, selectedBlueprint, author) => {
  if (!selectedBlueprint) {
    alert('Debes seleccionar un blueprint');
    return;
  }

  if (!Array.isArray(drawnPoints) || drawnPoints.length === 0) {
    alert('No hay puntos válidos capturados.');
    return;
  }

  const updatedBlueprint = {
    author: author, 
    name: selectedBlueprint.name,
    points: drawnPoints
  };

  console.log('JSON enviado:', JSON.stringify(updatedBlueprint, null, 2)); 

  const url = `http://localhost:8080/blueprints/${author}/${selectedBlueprint.name}`;

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedBlueprint) 
    });
    if (response.ok) {
      const data = await response.json();
      alert('Blueprint actualizado exitosamente.');
    } else {
      alert('Error al actualizar el blueprint.');
    }
  } catch (error) {
    console.error('Error al actualizar el blueprint:', error);
    alert('Ocurrió un error al intentar actualizar el blueprint.');
  }
};





// Función para dibujar puntos y líneas en el canvas interactivo del usuario
const drawUserPoints = (points, userCanvasRef) => {
  const canvas = userCanvasRef.current;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (points.length === 0) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.strokeStyle = '#3498db';
  ctx.lineWidth = 2;
  ctx.stroke();

  points.forEach(point => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#e74c3c';
    ctx.fill();
  });
};

// Función para cargar el blueprint en el canvas del usuario para modificar
const loadBlueprintInUserCanvas = (blueprint, setDrawnPoints, userCanvasRef, drawUserPoints) => {
  const points = blueprint.points.map(p => ({ x: p.x, y: p.y }));
  setDrawnPoints(points);
  drawUserPoints(points, userCanvasRef);
};

// Componente del modal para mostrar los blueprints en un canvas
const BlueprintModal = ({ modalIsOpen, setModalIsOpen, selectedBlueprint, canvasRef, drawBlueprint }) => (
  <Modal
    isOpen={modalIsOpen}
    onRequestClose={() => setModalIsOpen(false)}
    contentLabel="Blueprint Modal"
    style={{
      content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
        padding: '20px',
        borderRadius: '8px',
        maxWidth: '90%',
        maxHeight: '90%',
      },
    }}
    onAfterOpen={() => {
      if (selectedBlueprint) drawBlueprint(selectedBlueprint, canvasRef);
    }}
  >
    <div className="modal-content">
      <h2>{selectedBlueprint?.name}</h2>
      <canvas ref={canvasRef} width="400" height="400" className="styled-canvas"></canvas>
      <button className="button" onClick={() => setModalIsOpen(false)}>Close</button>
    </div>
  </Modal>
);

function BlueprintViewer() {
  const [author, setAuthor] = useState('');
  const [blueprints, setBlueprints] = useState([]);
  const [selectedBlueprint, setSelectedBlueprint] = useState(null);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [drawnPoints, setDrawnPoints] = useState([]); // Puntos dibujados por el usuario
  const canvasRef = useRef(null);
  const userCanvasRef = useRef(null); // Nuevo canvas para dibujar con clicks

  const totalPoints = blueprints.reduce((sum, bp) => sum + bp.points.length, 0);

  return (
    <div className="container">
      <h1 className="title"><FaDraftingCompass /> Blueprint Viewer</h1>
      <div className="input-group">
        <input
          type="text"
          className="input"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          placeholder="Enter author name"
          aria-label="Author name"
        />
        <button className="button" onClick={() => fetchBlueprints(author, setBlueprints, setSelectedBlueprint)}><FaSearch /> Get Blueprints</button>
      </div>

      {blueprints.length > 0 && (
        <>
          <h2>{author}'s blueprints:</h2>
          <table className="table">
            <thead>
              <tr>
                <th className="th">Blueprint name</th>
                <th className="th">Number of points</th>
                <th className="th">Action</th>
              </tr>
            </thead>
            <tbody>
              {blueprints.map((bp) => (
                <tr key={bp.name}>
                  <td className="td">{bp.name}</td>
                  <td className="td">{bp.points.length}</td>
                  <td className="td">
                    <button
                      className="button"
                      onClick={() => {
                        setSelectedBlueprint(bp);
                        loadBlueprintInUserCanvas(bp, setDrawnPoints, userCanvasRef, drawUserPoints);
                      }}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="total-points">Total user points: {totalPoints}</p>
        </>
      )}
      {/* Boton de save/update */}
      <button
        className="save-update"
        onClick={(e) => saveUpdateBluePrint(e, drawnPoints, selectedBlueprint, author)}
      >
        Save/Update
      </button>

      {/* Canvas interactivo del usuario para colocar puntos */}
      <div className="canvas-container">
        <h2>Blueprint</h2>

        <canvas
          ref={userCanvasRef}
          width="400"
          height="400"
          className="styled-canvas"
          
          onClick={(e) => handleUserCanvasClick(e, userCanvasRef, drawnPoints, setDrawnPoints, drawUserPoints, selectedBlueprint)}
        ></canvas>
      </div>

      <BlueprintModal
        modalIsOpen={modalIsOpen}
        setModalIsOpen={setModalIsOpen}
        selectedBlueprint={selectedBlueprint}
        canvasRef={canvasRef}
        drawBlueprint={drawBlueprint}
      />

    </div>
    
  );
}
export default BlueprintViewer;
