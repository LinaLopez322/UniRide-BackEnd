import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../SupabaseClient";
import { FaClock, FaPlus, FaTrash, FaWhatsapp, FaPhone, FaCar, FaMapMarkerAlt } from "react-icons/fa";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [horarios, setHorarios] = useState([]);
  const [coincidencias, setCoincidencias] = useState([]);
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

      // Obtener perfil del usuario
      const { data: perfilData, error: perfilError } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (perfilError) {
        // Si no tiene perfil, redirigir a selección de rol
        navigate("/seleccion-rol");
        return;
      }

      setPerfil(perfilData);
      await cargarHorarios(user.id, perfilData.rol);
      await buscarCoincidencias(user.id, perfilData.rol);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const cargarHorarios = async (userId, rol) => {
    const tabla = rol === "conductor" ? "horarios_conductor" : "horarios_pasajero";
    const columna = rol === "conductor" ? "conductor_id" : "pasajero_id";

    const { data, error } = await supabase
      .from(tabla)
      .select("*")
      .eq(columna, userId)
      .eq("activo", true)
      .order("dia_semana", { ascending: true });

    if (!error && data) {
      setHorarios(data);
    }
  };

  const buscarCoincidencias = async (userId, rol) => {
    try {
      if (rol === "conductor") {
        // Buscar pasajeros que coincidan con mis horarios
        const { data: misHorarios } = await supabase
          .from("horarios_conductor")
          .select("*")
          .eq("conductor_id", userId)
          .eq("activo", true);

        if (!misHorarios || misHorarios.length === 0) return;

        const { data: pasajeros } = await supabase
          .from("horarios_pasajero")
          .select(`
            *,
            perfiles (nombre_completo, email, telefono)
          `)
          .eq("activo", true);

        // Filtrar coincidencias
        const matches = [];
        misHorarios.forEach((miHorario) => {
          pasajeros?.forEach((pasajero) => {
            if (
              miHorario.dia_semana === pasajero.dia_semana &&
              miHorario.origen === pasajero.origen &&
              miHorario.destino === pasajero.destino &&
              coincideHorario(miHorario.hora_salida, pasajero.hora_aproximada, pasajero.flexibilidad_horario)
            ) {
              matches.push({
                ...pasajero,
                horario_conductor: miHorario,
              });
            }
          });
        });

        setCoincidencias(matches);
      } else {
        // Buscar conductores que coincidan con mis horarios
        const { data: misHorarios } = await supabase
          .from("horarios_pasajero")
          .select("*")
          .eq("pasajero_id", userId)
          .eq("activo", true);

        if (!misHorarios || misHorarios.length === 0) return;

        const { data: conductores } = await supabase
          .from("horarios_conductor")
          .select(`
            *,
            perfiles (nombre_completo, email, telefono),
            vehiculos:vehiculos!conductor_id (marca, modelo, color, placa)
          `)
          .eq("activo", true);

        // Filtrar coincidencias
        const matches = [];
        misHorarios.forEach((miHorario) => {
          conductores?.forEach((conductor) => {
            if (
              miHorario.dia_semana === conductor.dia_semana &&
              miHorario.origen === conductor.origen &&
              miHorario.destino === conductor.destino &&
              coincideHorario(conductor.hora_salida, miHorario.hora_aproximada, miHorario.flexibilidad_horario)
            ) {
              matches.push({
                ...conductor,
                horario_pasajero: miHorario,
              });
            }
          });
        });

        setCoincidencias(matches);
      }
    } catch (error) {
      console.error("Error buscando coincidencias:", error);
    }
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

    const tabla = perfil.rol === "conductor" ? "horarios_conductor" : "horarios_pasajero";
    const columna = perfil.rol === "conductor" ? "conductor_id" : "pasajero_id";

    const datos = {
      [columna]: user.id,
      ...nuevoHorario,
    };

    if (perfil.rol === "pasajero") {
      datos.hora_aproximada = nuevoHorario.hora_salida;
      delete datos.hora_salida;
      delete datos.cupos_disponibles;
      datos.flexibilidad_horario = 30;
    }

    const { error } = await supabase.from(tabla).insert(datos);

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

    await cargarHorarios(user.id, perfil.rol);
    await buscarCoincidencias(user.id, perfil.rol);
  };

  const eliminarHorario = async (horarioId) => {
    if (!confirm("¿Estás seguro de eliminar este horario?")) return;

    const tabla = perfil.rol === "conductor" ? "horarios_conductor" : "horarios_pasajero";

    const { error } = await supabase
      .from(tabla)
      .update({ activo: false })
      .eq("id", horarioId);

    if (!error) {
      await cargarHorarios(user.id, perfil.rol);
      await buscarCoincidencias(user.id, perfil.rol);
    }
  };

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const contactarWhatsApp = (telefono, nombre) => {
    const mensaje = encodeURIComponent(`Hola ${nombre}, vi tu horario en UniRide y me gustaría coordinar un viaje.`);
    window.open(`https://wa.me/57${telefono}?text=${mensaje}`, "_blank");
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
              <p className="text-sm text-gray-600">
                {perfil?.rol === "conductor" ? "Modo Conductor" : "Modo Pasajero"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-700">{perfil?.email}</span>
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
          {/* Sección de Mis Horarios */}
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
                <p className="text-sm">Agrega tus horarios para encontrar coincidencias</p>
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
                            {horario.hora_salida || horario.hora_aproximada}
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
                        {horario.cupos_disponibles && (
                          <p className="text-sm text-gray-500">
                            Cupos: {horario.cupos_disponibles}
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

          {/* Sección de Coincidencias */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {perfil?.rol === "conductor" ? "Pasajeros Disponibles" : "Conductores Disponibles"}
            </h2>

            {coincidencias.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FaCar className="text-6xl mx-auto mb-4 text-gray-300" />
                <p>No hay coincidencias disponibles</p>
                <p className="text-sm">Agrega más horarios para encontrar coincidencias</p>
              </div>
            ) : (
              <div className="space-y-4">
                {coincidencias.map((coincidencia, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-gray-800">
                          {coincidencia.perfiles?.nombre_completo || "Usuario"}
                        </h3>
                        <p className="text-sm text-gray-600">{coincidencia.perfiles?.email}</p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                        {coincidencia.dia_semana.toUpperCase()}
                      </span>
                    </div>

                    {perfil?.rol === "pasajero" && coincidencia.vehiculos?.[0] && (
                      <div className="mb-3 p-2 bg-gray-50 rounded">
                        <p className="text-sm text-gray-700">
                          <FaCar className="inline mr-2 text-[#f36d6d]" />
                          {coincidencia.vehiculos[0].marca} {coincidencia.vehiculos[0].modelo} - {coincidencia.vehiculos[0].color}
                        </p>
                        <p className="text-xs text-gray-500">Placa: {coincidencia.vehiculos[0].placa}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-3 text-gray-600">
                      <FaClock />
                      <span>{coincidencia.hora_salida || coincidencia.hora_aproximada}</span>
                      <span className="text-gray-400">|</span>
                      <FaMapMarkerAlt className="text-[#f36d6d]" />
                      <span className="capitalize">{coincidencia.origen} → {coincidencia.destino}</span>
                    </div>

                    {coincidencia.perfiles?.telefono && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => contactarWhatsApp(
                            coincidencia.perfiles.telefono,
                            coincidencia.perfiles.nombre_completo
                          )}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                        >
                          <FaWhatsapp /> WhatsApp
                        </button>
                        <a
                          href={`tel:+57${coincidencia.perfiles.telefono}`}
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
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
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

              {perfil?.rol === "conductor" && (
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
              )}

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

export default Home;