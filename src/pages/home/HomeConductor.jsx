import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../SupabaseClient";
import { FaClock, FaPlus, FaTrash, FaWhatsapp, FaPhone, FaCar, FaMapMarkerAlt, FaUser, FaCog } from "react-icons/fa";

const HomeConductor = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [vehiculo, setVehiculo] = useState(null);
  const [horarios, setHorarios] = useState([]);
  const [pasajeros, setPasajeros] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const [nuevoHorario, setNuevoHorario] = useState({
    dia_semana: "lunes",
    hora_salida: "",
    origen: "residencia",
    destino: "universidad",
    zona_residencia: "",
    cupos_disponibles: 4,
    observaciones: "",
  });

  useEffect(() => {
    verificarAutenticacion();
  }, []);

  const verificarAutenticacion = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/");
        return;
      }

      setUser(user);

      const { data: perfilData } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!perfilData || perfilData.rol !== "conductor") {
        navigate("/");
        return;
      }

      setPerfil(perfilData);

      // Cargar vehículo
      const { data: vehiculoData } = await supabase
        .from("vehiculos")
        .select("*")
        .eq("conductor_id", user.id)
        .single();

      setVehiculo(vehiculoData);

      await cargarHorarios(user.id);
      await buscarPasajeros(user.id);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const cargarHorarios = async (userId) => {
    const { data } = await supabase
      .from("horarios_conductor")
      .select("*")
      .eq("conductor_id", userId)
      .eq("activo", true)
      .order("dia_semana");

    if (data) setHorarios(data);
  };

  const buscarPasajeros = async (userId) => {
    const { data: misHorarios } = await supabase
      .from("horarios_conductor")
      .select("*")
      .eq("conductor_id", userId)
      .eq("activo", true);

    if (!misHorarios || misHorarios.length === 0) return;

    const { data: pasajerosData } = await supabase
      .from("horarios_pasajero")
      .select(`
        *,
        perfiles!horarios_pasajero_pasajero_id_fkey (
          id, nombre_completo, email, telefono, foto_perfil
        )
      `)
      .eq("activo", true);

    if (!pasajerosData) return;

    const matches = [];
    const pasajerosUnicos = new Map();

    misHorarios.forEach((miHorario) => {
      pasajerosData.forEach((pasajero) => {
        if (
          miHorario.dia_semana === pasajero.dia_semana &&
          miHorario.origen === pasajero.origen &&
          miHorario.destino === pasajero.destino &&
          coincideHorario(miHorario.hora_salida, pasajero.hora_aproximada, pasajero.flexibilidad_horario)
        ) {
          const pasajeroId = pasajero.perfiles.id;
          
          if (!pasajerosUnicos.has(pasajeroId)) {
            pasajerosUnicos.set(pasajeroId, {
              ...pasajero,
              horarios: [pasajero],
            });
          } else {
            pasajerosUnicos.get(pasajeroId).horarios.push(pasajero);
          }
        }
      });
    });

    setPasajeros(Array.from(pasajerosUnicos.values()));
  };

  const coincideHorario = (hora1, hora2, flexibilidad = 30) => {
    const [h1, m1] = hora1.split(":").map(Number);
    const [h2, m2] = hora2.split(":").map(Number);
    const minutos1 = h1 * 60 + m1;
    const minutos2 = h2 * 60 + m2;
    return Math.abs(minutos1 - minutos2) <= flexibilidad;
  };

  const agregarHorario = async (e) => {
    e.preventDefault();

    const { error } = await supabase.from("horarios_conductor").insert({
      conductor_id: user.id,
      ...nuevoHorario,
    });

    if (error) {
      alert("Error al agregar horario");
      return;
    }

    setShowModal(false);
    setNuevoHorario({
      dia_semana: "lunes",
      hora_salida: "",
      origen: "residencia",
      destino: "universidad",
      zona_residencia: "",
      cupos_disponibles: 4,
      observaciones: "",
    });

    await cargarHorarios(user.id);
    await buscarPasajeros(user.id);
  };

  const eliminarHorario = async (horarioId) => {
    if (!confirm("¿Eliminar este horario?")) return;

    await supabase
      .from("horarios_conductor")
      .update({ activo: false })
      .eq("id", horarioId);

    await cargarHorarios(user.id);
    await buscarPasajeros(user.id);
  };

  const contactarWhatsApp = (pasajero) => {
    const telefono = pasajero.perfiles.telefono;
    const nombre = pasajero.perfiles.nombre_completo;
    const mensaje = encodeURIComponent(
      `Hola ${nombre}, soy conductor en UniRide y vi que buscas viaje. ¿Te interesa coordinar?`
    );
    window.open(`https://wa.me/57${telefono}?text=${mensaje}`, "_blank");
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/img/Logo.jpg" alt="UniRide" className="w-12 h-12" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">UniRide</h1>
              <p className="text-sm text-gray-600">Modo Conductor</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-700">{perfil?.nombre_completo || "Conductor"}</p>
              <p className="text-xs text-gray-500">{perfil?.email}</p>
            </div>
            {vehiculo && (
              <div className="px-3 py-2 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600">Mi vehículo</p>
                <p className="text-sm font-semibold text-gray-800">
                  {vehiculo.marca} {vehiculo.modelo}
                </p>
                <p className="text-xs text-gray-500">{vehiculo.placa}</p>
              </div>
            )}
            <button
              onClick={() => navigate("/configuracion")}
              className="flex items-center gap-2 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-[#f36d6d] transition"
              title="Configuración de cuenta"
            >
              <FaCog className="text-lg text-gray-600" />
              <span className="text-sm font-medium">Configuración</span>
            </button>
            <button
              onClick={cerrarSesion}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Mis Horarios */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Mis Horarios</h2>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#f36d6d] text-white rounded-lg hover:bg-[#e65454] transition"
              >
                <FaPlus /> Agregar
              </button>
            </div>

            {horarios.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FaClock className="text-6xl mx-auto mb-4 text-gray-300" />
                <p>No tienes horarios registrados</p>
                <p className="text-sm">Agrega tus horarios para encontrar pasajeros</p>
              </div>
            ) : (
              <div className="space-y-4">
                {horarios.map((horario) => (
                  <div
                    key={horario.id}
                    className="border rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                            {horario.dia_semana.toUpperCase()}
                          </span>
                          <span className="text-lg font-bold text-gray-800">
                            {horario.hora_salida}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <FaMapMarkerAlt className="text-[#f36d6d]" />
                          <span className="capitalize">{horario.origen}</span>
                          <span>→</span>
                          <span className="capitalize">{horario.destino}</span>
                        </div>
                        {horario.zona_residencia && (
                          <p className="text-sm text-gray-500 mt-1">
                            Zona: {horario.zona_residencia}
                          </p>
                        )}
                        <p className="text-sm text-gray-500">
                          Cupos: {horario.cupos_disponibles}
                        </p>
                        {horario.observaciones && (
                          <p className="text-sm text-gray-600 mt-2 italic">
                            {horario.observaciones}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => eliminarHorario(horario.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pasajeros Disponibles */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              Pasajeros Buscando Viaje ({pasajeros.length})
            </h2>

            {pasajeros.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FaUser className="text-6xl mx-auto mb-4 text-gray-300" />
                <p>No hay pasajeros disponibles</p>
                <p className="text-sm">Cuando agregues horarios, aparecerán pasajeros que coincidan</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pasajeros.map((pasajero, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-start gap-4 mb-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        {pasajero.perfiles.foto_perfil ? (
                          <img 
                            src={pasajero.perfiles.foto_perfil} 
                            alt="Perfil"
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <FaUser className="text-xl text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-800">
                          {pasajero.perfiles.nombre_completo || "Pasajero"}
                        </h3>
                        <p className="text-sm text-gray-600">{pasajero.perfiles.email}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      <p className="text-sm font-semibold text-gray-700">Horarios que busca:</p>
                      {pasajero.horarios.slice(0, 2).map((h, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                            {h.dia_semana.toUpperCase()}
                          </span>
                          <FaClock className="text-gray-400" />
                          <span>{h.hora_aproximada}</span>
                          <FaMapMarkerAlt className="text-[#f36d6d]" />
                          <span className="capitalize">{h.origen} → {h.destino}</span>
                        </div>
                      ))}
                      {pasajero.horarios.length > 2 && (
                        <p className="text-xs text-gray-500">
                          +{pasajero.horarios.length - 2} horarios más
                        </p>
                      )}
                    </div>

                    {pasajero.perfiles.telefono && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => contactarWhatsApp(pasajero)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                        >
                          <FaWhatsapp /> WhatsApp
                        </button>
                        <a
                          href={`tel:+57${pasajero.perfiles.telefono}`}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                        >
                          <FaPhone /> Llamar
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Agregar Horario */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-6">Agregar Horario</h3>
            <form onSubmit={agregarHorario} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Día de la semana
                </label>
                <select
                  value={nuevoHorario.dia_semana}
                  onChange={(e) => setNuevoHorario({ ...nuevoHorario, dia_semana: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  required
                >
                  <option value="lunes">Lunes</option>
                  <option value="martes">Martes</option>
                  <option value="miercoles">Miércoles</option>
                  <option value="jueves">Jueves</option>
                  <option value="viernes">Viernes</option>
                  <option value="sabado">Sábado</option>
                  <option value="domingo">Domingo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hora de salida
                </label>
                <input
                  type="time"
                  value={nuevoHorario.hora_salida}
                  onChange={(e) => setNuevoHorario({ ...nuevoHorario, hora_salida: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Desde
                </label>
                <select
                  value={nuevoHorario.origen}
                  onChange={(e) => setNuevoHorario({ ...nuevoHorario, origen: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  required
                >
                  <option value="residencia">Mi residencia</option>
                  <option value="universidad">Universidad</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hacia
                </label>
                <select
                  value={nuevoHorario.destino}
                  onChange={(e) => setNuevoHorario({ ...nuevoHorario, destino: e.target.value })}
                  className="w-full border rounded-lg px-4 py-2"
                  required
                >
                  <option value="universidad">Universidad</option>
                  <option value="residencia">Mi residencia</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zona de residencia (opcional)
                </label>
                <input
                  type="text"
                  value={nuevoHorario.zona_residencia}
                  onChange={(e) => setNuevoHorario({ ...nuevoHorario, zona_residencia: e.target.value })}
                  placeholder="Ej: Meléndez, Ciudad Jardín"
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cupos disponibles
                </label>
                <input
                  type="number"
                  value={nuevoHorario.cupos_disponibles}
                  onChange={(e) => setNuevoHorario({ ...nuevoHorario, cupos_disponibles: parseInt(e.target.value) })}
                  min="1"
                  max="8"
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={nuevoHorario.observaciones}
                  onChange={(e) => setNuevoHorario({ ...nuevoHorario, observaciones: e.target.value })}
                  placeholder="Ej: Salgo del parqueadero norte"
                  rows="3"
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-[#f36d6d] text-white rounded-lg hover:bg-[#e65454] transition"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeConductor;