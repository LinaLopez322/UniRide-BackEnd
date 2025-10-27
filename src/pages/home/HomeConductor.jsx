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
  FaBell,
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

  // Estados para solicitudes y notificaciones
  const [solicitudesRecibidas, setSolicitudesRecibidas] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);

  // 🔹 Cargar usuario
  useEffect(() => {
    const obtenerUsuario = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        navigate("/");
      } else {
        setUserId(data.user.id);
      }
    };
    obtenerUsuario();
  }, [navigate]);

  // 🔹 Cargar horarios, solicitudes y notificaciones
  useEffect(() => {
    if (userId) {
      obtenerMisHorarios();
      cargarSolicitudesRecibidas();
      cargarNotificaciones();
      
      // Suscripción a notificaciones en tiempo real
      const subscription = supabase
        .channel('notificaciones')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notificaciones',
            filter: `usuario_id=eq.${userId}`
          }, 
          (payload) => {
            setNotificaciones(prev => [payload.new, ...prev]);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
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

  const cargarSolicitudesRecibidas = async () => {
    try {
      const { data, error } = await supabase
        .from("solicitudes_viaje")
        .select(`
          *,
          perfiles!solicitudes_viaje_pasajero_id_fkey(
            nombre_completo, 
            telefono,
            email
          ),
          horarios_conductor!inner(*)
        `)
        .eq("conductor_id", userId)
        .in("estado", ["pendiente", "aceptada"]);

      if (error) throw error;
      setSolicitudesRecibidas(data || []);
    } catch (error) {
      console.error("Error cargando solicitudes:", error);
    }
  };

  const cargarNotificaciones = async () => {
    try {
      const { data, error } = await supabase
        .from("notificaciones")
        .select("*")
        .eq("usuario_id", userId)
        .eq("leida", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotificaciones(data || []);
    } catch (error) {
      console.error("Error cargando notificaciones:", error);
    }
  };

  const guardarHorario = async () => {
    try {
      // Validaciones básicas
      if (!nuevoHorario.dia_semana || !nuevoHorario.hora_salida || !nuevoHorario.origen || !nuevoHorario.destino) {
        alert("Por favor completa todos los campos obligatorios");
        return;
      }

      // Convertir cupos a número (por si el input devuelve string)
      const cupos = parseInt(nuevoHorario.cupos_disponibles, 10) || 0;

      const { error } = await supabase.from("horarios_conductor").insert([
        {
          conductor_id: userId,
          dia_semana: nuevoHorario.dia_semana.toLowerCase(),
          hora_salida: nuevoHorario.hora_salida,
          origen: nuevoHorario.origen.toLowerCase(),
          destino: nuevoHorario.destino.toLowerCase(),
          zona_residencia: nuevoHorario.zona_residencia?.trim() || null,
          cupos_disponibles: cupos,
          activo: true,
        },
      ]);

      if (error) throw error;

      // Limpiar formulario
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
      console.error("❌ Error guardando horario:", error.message || error);
      alert("Error al guardar horario: " + (error.message || "Revisa los datos."));
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

  // 🔹 Funciones para solicitudes
  const aceptarSolicitud = async (solicitudId) => {
    try {
      // Actualizar estado de la solicitud
      const { error } = await supabase
        .from("solicitudes_viaje")
        .update({ estado: "aceptada" })
        .eq("id", solicitudId);

      if (error) throw error;

      // Obtener datos de la solicitud para la notificación
      const { data: solicitud } = await supabase
        .from("solicitudes_viaje")
        .select("pasajero_id, horarios_conductor!inner(dia_semana, hora_salida)")
        .eq("id", solicitudId)
        .single();

      // Crear notificación para el pasajero
      await supabase
        .from("notificaciones")
        .insert([
          {
            usuario_id: solicitud.pasajero_id,
            tipo: "viaje_aceptado",
            titulo: "¡Solicitud aceptada!",
            mensaje: `El conductor aceptó tu solicitud de viaje`,
            metadata: { solicitud_id: solicitudId }
          }
        ]);

      // Recargar datos
      await cargarSolicitudesRecibidas();
      await cargarNotificaciones();
      
      alert("Solicitud aceptada. El pasajero ha sido notificado.");

    } catch (error) {
      console.error("Error aceptando solicitud:", error);
      alert("Error al aceptar la solicitud");
    }
  };

  const rechazarSolicitud = async (solicitudId) => {
    try {
      const { error } = await supabase
        .from("solicitudes_viaje")
        .update({ estado: "rechazada" })
        .eq("id", solicitudId);

      if (error) throw error;

      await cargarSolicitudesRecibidas();
      
    } catch (error) {
      console.error("Error rechazando solicitud:", error);
    }
  };

  const marcarNotificacionLeida = async (notificacionId) => {
    try {
      const { error } = await supabase
        .from("notificaciones")
        .update({ leida: true })
        .eq("id", notificacionId);

      if (error) throw error;

      setNotificaciones(prev => 
        prev.filter(n => n.id !== notificacionId)
      );
    } catch (error) {
      console.error("Error marcando notificación:", error);
    }
  };

  // 🔹 Cerrar sesión
  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-5">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-700 flex items-center gap-2">
          <FaCar /> Panel del Conductor
        </h1>
        <div className="flex items-center gap-4">
          {/* Botón de notificaciones */}
          <div className="relative">
            <button
              onClick={() => setMostrarNotificaciones(!mostrarNotificaciones)}
              className="relative p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              <FaBell />
              {notificaciones.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {notificaciones.length}
                </span>
              )}
            </button>

            {/* Dropdown de notificaciones */}
            {mostrarNotificaciones && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b">
                  <h3 className="font-semibold">Notificaciones</h3>
                </div>
                {notificaciones.length === 0 ? (
                  <p className="p-4 text-gray-500 text-center">No hay notificaciones</p>
                ) : (
                  notificaciones.map(notif => (
                    <div key={notif.id} className="p-3 border-b hover:bg-gray-50">
                      <div className="flex justify-between">
                        <h4 className="font-semibold">{notif.titulo}</h4>
                        <button
                          onClick={() => marcarNotificacionLeida(notif.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      </div>
                      <p className="text-sm text-gray-600">{notif.mensaje}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notif.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={cerrarSesion}
            className="bg-red-500 text-white px-3 py-1 rounded-lg shadow hover:bg-red-600 transition flex items-center gap-2"
          >
            <FaSignOutAlt /> Salir
          </button>
        </div>
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

      {/* Solicitudes recibidas */}
      <div className="bg-white p-5 rounded-2xl shadow mt-6">
        <h2 className="text-lg font-semibold mb-4">
          Solicitudes de Viaje ({solicitudesRecibidas.filter(s => s.estado === 'pendiente').length})
        </h2>
        
        {solicitudesRecibidas.length === 0 ? (
          <p className="text-gray-500">No tienes solicitudes de viaje.</p>
        ) : (
          <div className="space-y-4">
            {solicitudesRecibidas.map(solicitud => (
              <div key={solicitud.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">
                      {solicitud.perfiles.nombre_completo}
                    </p>
                    <p className="text-sm text-gray-600">
                      {solicitud.perfiles.telefono} • {solicitud.perfiles.email}
                    </p>
                    <p className="text-sm mt-1">
                      <span className="font-semibold">Horario:</span> {solicitud.horarios_conductor.dia_semana} {solicitud.horarios_conductor.hora_salida}
                    </p>
                    <p className="text-sm">
                      <span className="font-semibold">Ruta:</span> {solicitud.horarios_conductor.origen} → {solicitud.horarios_conductor.destino}
                    </p>
                    <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                      solicitud.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                      solicitud.estado === 'aceptada' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {solicitud.estado.toUpperCase()}
                    </span>
                  </div>
                  
                  {solicitud.estado === 'pendiente' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => aceptarSolicitud(solicitud.id)}
                        className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                      >
                        Aceptar
                      </button>
                      <button
                        onClick={() => rechazarSolicitud(solicitud.id)}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        Rechazar
                      </button>
                    </div>
                  )}
                </div>
                {solicitud.mensaje && (
                  <p className="text-sm text-gray-600 mt-2 italic">"{solicitud.mensaje}"</p>
                )}
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
                <option value="miercoles">Miércoles</option>
                <option value="jueves">Jueves</option>
                <option value="viernes">Viernes</option>
                <option value="sabado">Sábado</option>
                <option value="domingo">Domingo</option>
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