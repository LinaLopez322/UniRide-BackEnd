import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../SupabaseClient";
import {
  FaClock,
  FaPlus,
  FaTrash,
  FaCar,
  FaUser,
  FaCog,
} from "react-icons/fa";

const HomePasajero = () => {
  const navigate = useNavigate();
  const [misHorarios, setMisHorarios] = useState([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [nuevoHorario, setNuevoHorario] = useState({
    dia_semana: "",
    hora_aproximada: "",
    origen: "",
  });
  const [userId, setUserId] = useState(null);

  // 🔹 Obtener usuario actual
  useEffect(() => {
    const obtenerUsuario = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        console.error("Error obteniendo usuario:", error);
        navigate("/login");
      } else {
        setUserId(data.user.id);
      }
    };
    obtenerUsuario();
  }, [navigate]);

  // 🔹 Cargar horarios del pasajero
  useEffect(() => {
    if (userId) {
      obtenerMisHorarios();
    }
  }, [userId]);

  const obtenerMisHorarios = async () => {
    try {
      const { data, error } = await supabase
        .from("horarios_pasajero")
        .select("*")
        .eq("pasajero_id", userId)
        .order("dia_semana", { ascending: true });

      if (error) throw error;
      setMisHorarios(data || []);
    } catch (error) {
      console.error("❌ Error obteniendo horarios:", error);
    }
  };

  // 🔹 Guardar nuevo horario
  const guardarHorario = async () => {
    try {
      if (!nuevoHorario.origen || !nuevoHorario.hora_aproximada || !nuevoHorario.dia_semana) {
        alert("Por favor completa todos los campos");
        return;
      }

      const { error } = await supabase.from("horarios_pasajero").insert([
        {
          pasajero_id: userId,
          dia_semana: nuevoHorario.dia_semana,
          hora_aproximada: nuevoHorario.hora_aproximada,
          origen: nuevoHorario.origen,
        },
      ]);

      if (error) throw error;

      setNuevoHorario({
        dia_semana: "",
        hora_aproximada: "",
        origen: "",
      });
      setMostrarModal(false);
      obtenerMisHorarios();
    } catch (error) {
      console.error("❌ Error guardando horario:", error);
    }
  };

  // 🔹 Eliminar horario
  const eliminarHorario = async (id) => {
    try {
      const { error } = await supabase.from("horarios_pasajero").delete().eq("id", id);
      if (error) throw error;
      obtenerMisHorarios();
    } catch (error) {
      console.error("❌ Error eliminando horario:", error);
    }
  };

  // 🔹 Cerrar sesión
  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-5 relative">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-700 flex items-center gap-2">
          <FaUser /> Panel del Pasajero
        </h1>
        <button
          onClick={cerrarSesion}
          className="bg-red-500 text-white px-3 py-1 rounded-lg shadow hover:bg-red-600 transition"
        >
          Cerrar sesión
        </button>
      </div>

      {/* Lista de horarios */}
      <div className="bg-white p-5 rounded-2xl shadow">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FaClock /> Mis Horarios
        </h2>
        {misHorarios.length === 0 ? (
          <p className="text-gray-500">No tienes horarios registrados.</p>
        ) : (
          <div className="space-y-3">
            {misHorarios.map((horario) => (
              <div
                key={horario.id}
                className="flex justify-between items-center border rounded-lg p-3"
              >
                <div>
                  <p className="font-semibold capitalize">
                    {horario.dia_semana} - {horario.hora_aproximada}
                  </p>
                  <p className="text-sm text-gray-600">
                    Origen: {horario.origen}
                  </p>
                </div>
                <button
                  onClick={() => eliminarHorario(horario.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <FaTrash />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botón flotante para abrir modal */}
      <button
        onClick={() => setMostrarModal(true)}
        className="fixed bottom-20 right-5 bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition"
      >
        <FaPlus size={20} />
      </button>

      {/* Configuración */}
      <div className="fixed bottom-5 right-5">
        <button
          onClick={() => navigate("/configuracion")}
          className="bg-gray-700 text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition"
        >
          <FaCog />
        </button>
      </div>

      {/* Modal */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-6 rounded-2xl shadow-lg w-96 relative">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2">
              <FaPlus /> Nuevo Horario
            </h2>

            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Día de la semana"
                className="border p-2 rounded"
                value={nuevoHorario.dia_semana}
                onChange={(e) =>
                  setNuevoHorario({ ...nuevoHorario, dia_semana: e.target.value })
                }
              />
              <input
                type="time"
                placeholder="Hora aproximada"
                className="border p-2 rounded"
                value={nuevoHorario.hora_aproximada}
                onChange={(e) =>
                  setNuevoHorario({ ...nuevoHorario, hora_aproximada: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Origen"
                className="border p-2 rounded"
                value={nuevoHorario.origen}
                onChange={(e) =>
                  setNuevoHorario({ ...nuevoHorario, origen: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setMostrarModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
              <button
                onClick={guardarHorario}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePasajero;
