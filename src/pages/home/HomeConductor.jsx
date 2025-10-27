import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../SupabaseClient";
import {
  FaClock,
  FaPlus,
  FaTrash,
  FaCar,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";

const HomeConductor = () => {
  const navigate = useNavigate();
  const [misHorarios, setMisHorarios] = useState([]);
  const [nuevoHorario, setNuevoHorario] = useState({
    dia_semana: "",
    hora_salida: "",
    origen: "",
    destino: "",
    zona_residencia: "",
    cupos_disponibles: "",
  });
  const [userId, setUserId] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);

  // 🔹 Cargar usuario
  useEffect(() => {
    const obtenerUsuario = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        navigate("/Autenticacion");
      } else {
        setUserId(data.user.id);
      }
    };
    obtenerUsuario();
  }, [navigate]);

  // 🔹 Cargar horarios
  useEffect(() => {
    if (userId) obtenerMisHorarios();
  }, [userId]);

  const obtenerMisHorarios = async () => {
    try {
      const { data, error } = await supabase
        .from("horarios_conductor")
        .select("*")
        .eq("conductor_id", userId)
        .order("id", { ascending: true });
      if (error) throw error;
      setMisHorarios(data || []);
    } catch (error) {
      console.error("❌ Error obteniendo mis horarios:", error);
    }
  };

  // 🔹 Guardar horario (corrige constraint)
  const guardarHorario = async () => {
    try {
      if (!nuevoHorario.hora_salida) {
        alert("Por favor selecciona una hora de salida válida");
        return;
      }

      const { error } = await supabase.from("horarios_conductor").insert([
        {
          conductor_id: userId,
          dia_semana: nuevoHorario.dia_semana.toLowerCase(),
          hora_salida: nuevoHorario.hora_salida,
          origen: nuevoHorario.origen.toLowerCase(),
          destino: nuevoHorario.destino.toLowerCase(),
          zona_residencia: nuevoHorario.zona_residencia || null,
          cupos_disponibles: nuevoHorario.cupos_disponibles || 0,
        },
      ]);

      if (error) throw error;

      setNuevoHorario({
        dia_semana: "",
        hora_salida: "",
        origen: "",
        destino: "",
        zona_residencia: "",
        cupos_disponibles: "",
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
      const { error } = await supabase
        .from("horarios_conductor")
        .delete()
        .eq("id", id);
      if (error) throw error;
      obtenerMisHorarios();
    } catch (error) {
      console.error("❌ Error eliminando horario:", error);
    }
  };

  // 🔹 Cerrar sesión
  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    navigate("/Autenticacion");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-700 flex items-center gap-2">
          <FaCar /> Panel del Conductor
        </h1>
        <button
          onClick={cerrarSesion}
          className="bg-red-500 text-white px-3 py-1 rounded-lg shadow hover:bg-red-600 transition flex items-center gap-2"
        >
          <FaSignOutAlt /> Salir
        </button>
      </div>

      {/* Mis horarios */}
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
                className="flex justify-between items-center border rounded-lg p-3 hover:bg-gray-50 transition"
              >
                <div>
                  <p className="font-semibold capitalize">
                    {horario.dia_semana} - {horario.hora_salida}
                  </p>
                  <p className="text-sm text-gray-600">
                    {horario.origen} → {horario.destino}
                  </p>
                  <p className="text-sm text-gray-500">
                    Zona: {horario.zona_residencia || "No especificada"} | Cupos:{" "}
                    {horario.cupos_disponibles}
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
        className="fixed bottom-6 right-6 bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition"
      >
        <FaPlus className="text-xl" />
      </button>

      {/* Modal */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg w-11/12 md:w-1/2 p-6 relative">
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              Nuevo Horario
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                className="border p-2 rounded"
                value={nuevoHorario.dia_semana}
                onChange={(e) =>
                  setNuevoHorario({
                    ...nuevoHorario,
                    dia_semana: e.target.value,
                  })
                }
              >
                <option value="">Seleccionar día</option>
                <option value="lunes">Lunes</option>
                <option value="martes">Martes</option>
                <option value="miércoles">Miércoles</option>
                <option value="jueves">Jueves</option>
                <option value="viernes">Viernes</option>
              </select>

              <input
                type="time"
                className="border p-2 rounded"
                value={nuevoHorario.hora_salida}
                onChange={(e) =>
                  setNuevoHorario({
                    ...nuevoHorario,
                    hora_salida: e.target.value,
                  })
                }
              />

              <select
                className="border p-2 rounded"
                value={nuevoHorario.origen}
                onChange={(e) =>
                  setNuevoHorario({
                    ...nuevoHorario,
                    origen: e.target.value,
                  })
                }
              >
                <option value="">Seleccionar origen</option>
                <option value="universidad">Universidad</option>
                <option value="residencia">Residencia</option>
              </select>

              <select
                className="border p-2 rounded"
                value={nuevoHorario.destino}
                onChange={(e) =>
                  setNuevoHorario({
                    ...nuevoHorario,
                    destino: e.target.value,
                  })
                }
              >
                <option value="">Seleccionar destino</option>
                <option value="universidad">Universidad</option>
                <option value="residencia">Residencia</option>
              </select>

              <input
                type="text"
                placeholder="Zona de residencia"
                className="border p-2 rounded md:col-span-2"
                value={nuevoHorario.zona_residencia}
                onChange={(e) =>
                  setNuevoHorario({
                    ...nuevoHorario,
                    zona_residencia: e.target.value,
                  })
                }
              />

              <input
                type="number"
                placeholder="Cupos disponibles"
                className="border p-2 rounded md:col-span-2"
                value={nuevoHorario.cupos_disponibles}
                onChange={(e) =>
                  setNuevoHorario({
                    ...nuevoHorario,
                    cupos_disponibles: e.target.value,
                  })
                }
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setMostrarModal(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
              <button
                onClick={guardarHorario}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Configuración */}
      <div className="fixed bottom-6 left-6">
        <button
          onClick={() => navigate("/configuracion")}
          className="bg-gray-700 text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition"
        >
          <FaCog />
        </button>
      </div>
    </div>
  );
};

export default HomeConductor;
