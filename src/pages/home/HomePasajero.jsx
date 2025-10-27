import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../SupabaseClient.js";
import {
  FaClock,
  FaPlus,
  FaTrash,
  FaWhatsapp,
  FaPhone,
  FaCar,
  FaMapMarkerAlt,
  FaStar,
  FaRegStar,
  FaFilter,
  FaUser,
  FaHistory,
  FaEdit,
  FaCog,
  FaBell,
} from "react-icons/fa";

const HomePasajero = () => {
  const navigate = useNavigate();

  // ---- Estados principales ----
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [conductores, setConductores] = useState([]);
  const [conductoresFiltrados, setConductoresFiltrados] = useState([]);
  const [favoritos, setFavoritos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vistaActual, setVistaActual] = useState("buscar");

  // Estados para solicitudes y notificaciones
  const [solicitudesEnviadas, setSolicitudesEnviadas] = useState([]);
  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);

  // Filtros
  const [filtros, setFiltros] = useState({
    dia_semana: "",
    zona_residencia: "",
    origen: "",
  });

  // ---- Estados para horarios del pasajero ----
  const [horariosPasajero, setHorariosPasajero] = useState([]);
  const [mostrarModalHorario, setMostrarModalHorario] = useState(false);
  const [modoEdicionHorario, setModoEdicionHorario] = useState(false);
  const [horarioEditar, setHorarioEditar] = useState(null);
  const [nuevoHorario, setNuevoHorario] = useState({
    dia_semana: "",
    hora_aproximada: "",
    origen: "",
  });

  useEffect(() => {
    verificarAutenticacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------- AUTENTICACIÓN Y CARGA INICIAL -------------------
  const verificarAutenticacion = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/");
        return;
      }

      setUser(user);

      const { data: perfilData, error: errPerfil } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (errPerfil || !perfilData || perfilData.rol !== "pasajero") {
        navigate("/");
        return;
      }

      setPerfil(perfilData);

      // Cargar cosas simultáneamente
      await Promise.all([
        cargarConductores(),
        cargarFavoritos(user.id),
        cargarHistorial(user.id),
        cargarHorariosPasajero(user.id),
        cargarSolicitudesEnviadas(user.id),
        cargarNotificacionesPasajero(user.id),
      ]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // ------------------- FUNCIONES EXISTENTES -------------------
  const cargarConductores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("perfiles")
        .select(
          `id, nombre_completo, email, telefono, foto_perfil, rol,
           horarios_conductor!inner(
             id, dia_semana, hora_salida, origen, destino, zona_residencia, activo
           ),
           vehiculos(
             marca, modelo, color, placa, anio
           )`
        )
        .eq("rol", "conductor")
        .eq("horarios_conductor.activo", true);

      if (error) {
        console.error("Error cargando conductores:", error.message);
        setConductores([]);
        return;
      }

      if (!data || data.length === 0) {
        setConductores([]);
        return;
      }

      const conductoresActivos = data.filter((c) =>
        c.horarios_conductor?.some((h) => h.activo)
      );

      const conductoresFormateados = conductoresActivos.map((conductor) => ({
        ...conductor,
        perfiles: {
          id: conductor.id,
          nombre_completo: conductor.nombre_completo,
          email: conductor.email,
          telefono: conductor.telefono,
          foto_perfil: conductor.foto_perfil,
        },
        horarios: conductor.horarios_conductor || [],
      }));

      setConductores(conductoresFormateados);
      setConductoresFiltrados(conductoresFormateados);
    } catch (error) {
      console.error("Error inesperado al cargar conductores:", error);
      setConductores([]);
    } finally {
      setLoading(false);
    }
  };

  const cargarFavoritos = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("conductores_favoritos")
        .select(
          `*, perfiles!conductores_favoritos_conductor_id_fkey(
            id, nombre_completo, email, telefono
          )`
        )
        .eq("pasajero_id", userId);

      if (error) {
        console.error("Error cargando favoritos:", error);
        return;
      }
      if (data) setFavoritos(data);
    } catch (error) {
      console.error("Error en cargarFavoritos:", error);
    }
  };

  const cargarHistorial = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("historial_contactos")
        .select(
          `*, perfiles!historial_contactos_conductor_id_fkey(
            nombre_completo, email, telefono
          )`
        )
        .eq("pasajero_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error cargando historial:", error);
        return;
      }
      if (data) setHistorial(data);
    } catch (error) {
      console.error("Error en cargarHistorial:", error);
    }
  };

  const toggleFavorito = async (conductorId) => {
    try {
      const esFavorito = favoritos.some((f) => f.conductor_id === conductorId);

      if (esFavorito) {
        const { error } = await supabase
          .from("conductores_favoritos")
          .delete()
          .eq("pasajero_id", user.id)
          .eq("conductor_id", conductorId);

        if (error) {
          console.error("Error eliminando favorito:", error);
          return;
        }
      } else {
        const { error } = await supabase
          .from("conductores_favoritos")
          .insert({
            pasajero_id: user.id,
            conductor_id: conductorId,
          });

        if (error) {
          console.error("Error agregando favorito:", error);
          return;
        }
      }

      await cargarFavoritos(user.id);
    } catch (error) {
      console.error("Error en toggleFavorito:", error);
    }
  };

  const registrarContacto = async (conductorId, tipo) => {
    try {
      const { error } = await supabase.from("historial_contactos").insert({
        pasajero_id: user.id,
        conductor_id: conductorId,
        tipo_contacto: tipo,
      });

      if (error) {
        console.error("Error registrando contacto:", error);
      }
    } catch (error) {
      console.error("Error en registrarContacto:", error);
    }
  };

  const contactarWhatsApp = (conductor) => {
    const telefono = conductor.perfiles.telefono;
    const nombre = conductor.perfiles.nombre_completo;

    if (!telefono) {
      alert("Este conductor no tiene número de teléfono registrado");
      return;
    }

    const mensaje = encodeURIComponent(
      `Hola ${nombre}, vi tu perfil en UniRide y me gustaría coordinar un viaje.`
    );
    window.open(`https://wa.me/57${telefono}?text=${mensaje}`, "_blank");
    registrarContacto(conductor.perfiles.id, "whatsapp");
  };

  const aplicarFiltros = () => {
    let filtrados = [...conductores];

    if (filtros.dia_semana) {
      filtrados = filtrados.filter((c) =>
        c.horarios.some((h) => h.dia_semana === filtros.dia_semana)
      );
    }

    if (filtros.zona_residencia) {
      filtrados = filtrados.filter((c) =>
        c.horarios.some((h) =>
          h.zona_residencia
            ?.toLowerCase()
            .includes(filtros.zona_residencia.toLowerCase())
        )
      );
    }

    if (filtros.origen) {
      filtrados = filtrados.filter((c) =>
        c.horarios.some((h) => h.origen === filtros.origen)
      );
    }

    setConductoresFiltrados(filtrados);
  };

  const cerrarSesion = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
  };

  const formatearTelefono = (telefono) => {
    if (!telefono) return "Sin teléfono";
    const soloNumeros = telefono.replace(/\D/g, "");
    if (soloNumeros.length === 10) {
      return `+57 ${soloNumeros.substring(0, 3)} ${soloNumeros.substring(
        3,
        6
      )} ${soloNumeros.substring(6)}`;
    } else if (soloNumeros.length > 10) {
      return `+${soloNumeros}`;
    }
    return telefono;
  };

  // ------------------- HORARIOS DEL PASAJERO -------------------
  const cargarHorariosPasajero = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("horarios_pasajero")
        .select("*")
        .eq("pasajero_id", userId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error cargando horarios del pasajero:", error);
        setHorariosPasajero([]);
        return;
      }

      setHorariosPasajero(data || []);
    } catch (error) {
      console.error("Error inesperado cargando horarios del pasajero:", error);
      setHorariosPasajero([]);
    }
  };

  const abrirModalNuevoHorario = () => {
    setModoEdicionHorario(false);
    setHorarioEditar(null);
    setNuevoHorario({ dia_semana: "", hora_aproximada: "", origen: "" });
    setMostrarModalHorario(true);
  };

  const guardarHorario = async () => {
    if (
      !nuevoHorario.dia_semana ||
      !nuevoHorario.hora_aproximada ||
      !nuevoHorario.origen
    ) {
      alert("Por favor completa todos los campos");
      return;
    }

    const datos = {
      pasajero_id: user.id,
      dia_semana: nuevoHorario.dia_semana,
      hora_aproximada: nuevoHorario.hora_aproximada,
      origen: nuevoHorario.origen.toLowerCase(),
      destino:
        nuevoHorario.origen.toLowerCase() === "universidad"
          ? "residencia"
          : "universidad",
      zona_residencia: perfil?.zona_residencia || "",
      flexibilidad_horario: 30,
    };

    try {
      if (modoEdicionHorario && horarioEditar) {
        const { error } = await supabase
          .from("horarios_pasajero")
          .update(datos)
          .eq("id", horarioEditar.id);

        if (error) throw error;
        alert("Horario actualizado correctamente");
      } else {
        const { error } = await supabase.from("horarios_pasajero").insert([
          datos,
        ]);
        if (error) throw error;
        alert("Horario guardado exitosamente");
      }

      setMostrarModalHorario(false);
      setHorarioEditar(null);
      setModoEdicionHorario(false);
      setNuevoHorario({ dia_semana: "", hora_aproximada: "", origen: "" });
      await cargarHorariosPasajero(user.id);
    } catch (error) {
      console.error("Error guardando horario pasajero:", error);
      alert("No se pudo guardar el horario. Revisa la consola.");
    }
  };

  const editarHorario = (h) => {
    setModoEdicionHorario(true);
    setHorarioEditar(h);
    setNuevoHorario({
      dia_semana: h.dia_semana,
      hora_aproximada: h.hora_aproximada,
      origen: h.origen,
    });
    setMostrarModalHorario(true);
  };

  const eliminarHorario = async (id) => {
    if (!window.confirm("¿Eliminar este horario?")) return;
    try {
      const { error } = await supabase
        .from("horarios_pasajero")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setHorariosPasajero((prev) => prev.filter((x) => x.id !== id));
    } catch (error) {
      console.error("Error eliminando horario pasajero:", error);
      alert("No se pudo eliminar el horario.");
    }
  };

  // ------------------- SOLICITUDES Y NOTIFICACIONES -------------------
  const cargarSolicitudesEnviadas = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("solicitudes_viaje")
        .select(`
          *,
          perfiles!solicitudes_viaje_conductor_id_fkey(nombre_completo),
          horarios_conductor(dia_semana, hora_salida, origen, destino)
        `)
        .eq("pasajero_id", userId)
        .in("estado", ["pendiente", "aceptada"]);

      if (error) throw error;
      setSolicitudesEnviadas(data || []);
    } catch (error) {
      console.error("Error cargando solicitudes:", error);
    }
  };

  const cargarNotificacionesPasajero = async (userId) => {
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

  const enviarSolicitud = async (conductorId, horarioId) => {
    try {
      const { data, error } = await supabase
        .from("solicitudes_viaje")
        .insert([
          {
            pasajero_id: user.id,
            conductor_id: conductorId,
            horario_conductor_id: horarioId,
            estado: "pendiente",
            mensaje: `Solicitud de viaje de ${perfil?.nombre_completo || 'Pasajero'}`
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Crear notificación para el conductor
      await supabase
        .from("notificaciones")
        .insert([
          {
            usuario_id: conductorId,
            tipo: "solicitud_viaje",
            titulo: "Nueva solicitud de viaje",
            mensaje: `${perfil?.nombre_completo || 'Un pasajero'} quiere viajar contigo`,
            metadata: { solicitud_id: data.id }
          }
        ]);

      setSolicitudesEnviadas(prev => [...prev, data]);
      alert("Solicitud enviada al conductor");

    } catch (error) {
      console.error("Error enviando solicitud:", error);
      alert("Error al enviar la solicitud");
    }
  };

  const cancelarSolicitud = async (solicitudId) => {
    try {
      const { error } = await supabase
        .from("solicitudes_viaje")
        .update({ estado: "cancelada" })
        .eq("id", solicitudId);

      if (error) throw error;

      setSolicitudesEnviadas(prev => 
        prev.filter(s => s.id !== solicitudId)
      );
      
    } catch (error) {
      console.error("Error cancelando solicitud:", error);
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

  // Suscripción a notificaciones en tiempo real
  useEffect(() => {
    if (user?.id) {
      const subscription = supabase
        .channel('notificaciones-pasajero')
        .on('postgres_changes', 
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notificaciones',
            filter: `usuario_id=eq.${user.id}`
          }, 
          (payload) => {
            setNotificaciones(prev => [payload.new, ...prev]);
            // Recargar solicitudes cuando llegue una notificación de aceptación
            if (payload.new.tipo === 'viaje_aceptado') {
              cargarSolicitudesEnviadas(user.id);
              alert("¡Un conductor aceptó tu solicitud de viaje!");
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user?.id]);

  // ------------------- UI -------------------
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
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/img/Logo.jpg" alt="UniRide" className="w-12 h-12" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">UniRide</h1>
              <p className="text-sm text-gray-600">Modo Pasajero</p>
            </div>
          </div>
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

            <button className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 transition">
              <FaUser className="text-gray-600" />
              <span className="text-sm">{perfil?.nombre_completo || "Perfil"}</span>
            </button>
            <button
              onClick={cerrarSesion}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Navegación de pestañas */}
        <div className="border-t">
          <div className="max-w-7xl mx-auto px-4 flex gap-2">
            <button
              onClick={() => setVistaActual("buscar")}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                vistaActual === "buscar"
                  ? "border-[#f36d6d] text-[#f36d6d]"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              Buscar Conductores
            </button>
            <button
              onClick={() => setVistaActual("favoritos")}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                vistaActual === "favoritos"
                  ? "border-[#f36d6d] text-[#f36d6d]"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              Favoritos ({favoritos.length})
            </button>
            <button
              onClick={() => setVistaActual("historial")}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                vistaActual === "historial"
                  ? "border-[#f36d6d] text-[#f36d6d]"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              Historial
            </button>
            <button
              onClick={() => setVistaActual("solicitudes")}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                vistaActual === "solicitudes"
                  ? "border-[#f36d6d] text-[#f36d6d]"
                  : "border-transparent text-gray-600 hover:text-gray-800"
              }`}
            >
              Mis Solicitudes ({solicitudesEnviadas.filter(s => s.estado === 'pendiente').length})
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* VISTA: Buscar Conductores */}
        {vistaActual === "buscar" && (
          <div>
            {/* filtros */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <FaFilter className="text-[#f36d6d]" />
                <h2 className="text-xl font-bold">Filtrar Conductores</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={filtros.dia_semana}
                  onChange={(e) => setFiltros({ ...filtros, dia_semana: e.target.value })}
                  className="border rounded-lg px-4 py-2"
                >
                  <option value="">Todos los días</option>
                  <option value="lunes">Lunes</option>
                  <option value="martes">Martes</option>
                  <option value="miercoles">Miércoles</option>
                  <option value="jueves">Jueves</option>
                  <option value="viernes">Viernes</option>
                  <option value="sabado">Sábado</option>
                  <option value="domingo">Domingo</option>
                </select>

                <input
                  type="text"
                  placeholder="Zona (ej: Meléndez)"
                  value={filtros.zona_residencia}
                  onChange={(e) => setFiltros({ ...filtros, zona_residencia: e.target.value })}
                  className="border rounded-lg px-4 py-2"
                />

                <select
                  value={filtros.origen}
                  onChange={(e) => setFiltros({ ...filtros, origen: e.target.value })}
                  className="border rounded-lg px-4 py-2"
                >
                  <option value="">Cualquier origen</option>
                  <option value="residencia">Desde residencia</option>
                  <option value="universidad">Desde universidad</option>
                </select>
              </div>

              <button
                onClick={aplicarFiltros}
                className="mt-4 w-full px-4 py-2 bg-[#f36d6d] text-white rounded-lg hover:bg-[#e65454]"
              >
                Aplicar Filtros
              </button>
            </div>

            {/* Lista conductores */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold mb-6">Conductores Disponibles ({conductoresFiltrados.length})</h2>

              {conductoresFiltrados.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FaCar className="text-6xl mx-auto mb-4 text-gray-300" />
                  <p>No hay conductores disponibles</p>
                  <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {conductoresFiltrados.map((conductor, idx) => {
                    const esFavorito = favoritos.some((f) => f.conductor_id === conductor.perfiles.id);
                    const vehiculo = conductor.vehiculos?.[0];

                    return (
                      <div key={idx} className="border rounded-lg p-6 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                              {conductor.perfiles.foto_perfil ? (
                                <img src={conductor.perfiles.foto_perfil} alt="Perfil" className="w-full h-full object-cover" />
                              ) : (
                                <FaUser className="text-3xl text-gray-400" />
                              )}
                            </div>

                            <div>
                              <h3 className="text-lg font-bold text-gray-800">
                                {conductor.perfiles.nombre_completo || "Conductor"}
                              </h3>
                              <p className="text-sm text-gray-600">{conductor.perfiles.email}</p>

                              <div className="mt-1 flex items-center gap-2">
                                <FaPhone className="text-green-500 text-sm" />
                                <span className="text-sm font-medium text-gray-700">
                                  {formatearTelefono(conductor.perfiles.telefono)}
                                </span>
                              </div>

                              {vehiculo && (
                                <div className="mt-2 flex items-center gap-2 text-gray-700">
                                  <FaCar className="text-[#f36d6d]" />
                                  <span className="text-sm">
                                    {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio} - {vehiculo.color}
                                  </span>
                                  <span className="text-xs text-gray-500">({vehiculo.placa})</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <button onClick={() => toggleFavorito(conductor.perfiles.id)} className="text-2xl transition">
                            {esFavorito ? <FaStar className="text-yellow-500" /> : <FaRegStar className="text-gray-400 hover:text-yellow-500" />}
                          </button>
                        </div>

                        {/* horarios conductor */}
                        <div className="mb-4 space-y-2">
                          <p className="text-sm font-semibold text-gray-700">Horarios disponibles:</p>
                          {conductor.horarios.slice(0, 3).map((h, i) => (
                            <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                                {h.dia_semana.toUpperCase()}
                              </span>
                              <FaClock className="text-gray-400" />
                              <span>{h.hora_salida}</span>
                              <FaMapMarkerAlt className="text-[#f36d6d]" />
                              <span className="capitalize">{h.origen} → {h.destino}</span>
                              {h.zona_residencia && <span className="text-xs text-gray-500">({h.zona_residencia})</span>}
                            </div>
                          ))}
                          {conductor.horarios.length > 3 && <p className="text-xs text-gray-500">+{conductor.horarios.length - 3} horarios más</p>}
                        </div>

                        {/* Solicitudes de viaje */}
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm font-semibold mb-2">Solicitar viaje en horario:</p>
                          {conductor.horarios.slice(0, 2).map((horario) => {
                            const solicitudExistente = solicitudesEnviadas.find(
                              s => s.horario_conductor_id === horario.id && s.estado === "pendiente"
                            );
                            
                            return (
                              <div key={horario.id} className="flex justify-between items-center mb-2">
                                <span className="text-sm">
                                  {horario.dia_semana} {horario.hora_salida} 
                                  ({horario.origen} → {horario.destino})
                                </span>
                                
                                {solicitudExistente ? (
                                  <button
                                    onClick={() => cancelarSolicitud(solicitudExistente.id)}
                                    className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                                  >
                                    Cancelar Solicitud
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => enviarSolicitud(conductor.perfiles.id, horario.id)}
                                    className="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600"
                                  >
                                    Solicitar Viaje
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {conductor.perfiles.telefono && (
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => contactarWhatsApp(conductor)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">
                              <FaWhatsapp /> WhatsApp
                            </button>
                            <a
                              href={`tel:+57${conductor.perfiles.telefono}`}
                              onClick={() => registrarContacto(conductor.perfiles.id, "llamada")}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                            >
                              <FaPhone /> Llamar
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SECCIÓN: HORARIOS DEL PASAJERO */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  Tus Horarios (Pasajero)
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={abrirModalNuevoHorario}
                    className="flex items-center gap-2 px-4 py-2 bg-[#f36d6d] text-white rounded-lg hover:bg-[#e65454]"
                  >
                    <FaPlus /> Nuevo Horario
                  </button>
                </div>
              </div>

              {horariosPasajero.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <p>No tienes horarios guardados.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {horariosPasajero.map((h) => (
                    <div key={h.id} className="border rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <p className="font-semibold capitalize">{h.dia_semana}</p>
                        <p className="text-sm text-gray-600">{h.hora_aproximada} • Origen: <span className="font-medium">{h.origen}</span></p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => editarHorario(h)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"><FaEdit /></button>
                        <button onClick={() => eliminarHorario(h.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><FaTrash /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA: Favoritos */}
        {vistaActual === "favoritos" && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Conductores Favoritos</h2>
            {favoritos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FaStar className="text-6xl mx-auto mb-4 text-gray-300" />
                <p>No tienes conductores favoritos</p>
                <p className="text-sm">Marca como favoritos a los conductores que más uses</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {favoritos.map((fav) => (
                  <div key={fav.id} className="border rounded-lg p-4 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-800">{fav.perfiles.nombre_completo || "Conductor"}</h3>
                        <p className="text-sm text-gray-600">{fav.perfiles.email}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <FaPhone className="text-green-500 text-sm" />
                          <span className="text-sm font-medium text-gray-700">{formatearTelefono(fav.perfiles.telefono)}</span>
                        </div>
                        {fav.notas && <p className="text-sm text-gray-500 mt-2 italic">{fav.notas}</p>}
                      </div>
                      <button onClick={() => toggleFavorito(fav.conductor_id)} className="text-yellow-500 text-xl hover:text-gray-400"><FaStar /></button>
                    </div>
                    {fav.perfiles.telefono && (
                      <div className="flex gap-2 mt-3">
                        <a href={`https://wa.me/57${fav.perfiles.telefono}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm">
                          <FaWhatsapp /> Contactar
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VISTA: Historial */}
        {vistaActual === "historial" && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Historial de Contactos</h2>
            {historial.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FaHistory className="text-6xl mx-auto mb-4 text-gray-300" />
                <p>No tienes historial de contactos</p>
                <p className="text-sm">Aquí aparecerán los conductores que contactes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historial.map((contacto) => (
                  <div key={contacto.id} className="border-l-4 border-[#f36d6d] bg-gray-50 p-4 rounded">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800">{contacto.perfiles.nombre_completo || "Conductor"}</p>
                        <p className="text-sm text-gray-600">{contacto.perfiles.email}</p>
                        {contacto.perfiles.telefono && (
                          <div className="mt-1 flex items-center gap-2">
                            <FaPhone className="text-green-500 text-xs" />
                            <span className="text-xs font-medium text-gray-700">{formatearTelefono(contacto.perfiles.telefono)}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-sm">
                          {contacto.tipo_contacto === "whatsapp" ? <FaWhatsapp className="text-green-500" /> : <FaPhone className="text-blue-500" />}
                          <span className="capitalize text-gray-600">{contacto.tipo_contacto}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{new Date(contacto.created_at).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VISTA: Mis Solicitudes */}
        {vistaActual === "solicitudes" && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Mis Solicitudes de Viaje</h2>
            {solicitudesEnviadas.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FaClock className="text-6xl mx-auto mb-4 text-gray-300" />
                <p>No tienes solicitudes de viaje</p>
                <p className="text-sm">Envía solicitudes a conductores desde la pestaña "Buscar Conductores"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {solicitudesEnviadas.map((solicitud) => (
                  <div key={solicitud.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">
                          Conductor: {solicitud.perfiles.nombre_completo}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-semibold">Horario:</span> {solicitud.horarios_conductor.dia_semana} {solicitud.horarios_conductor.hora_salida}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">Ruta:</span> {solicitud.horarios_conductor.origen} → {solicitud.horarios_conductor.destino}
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                          Enviada: {new Date(solicitud.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-sm rounded-full ${
                        solicitud.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        solicitud.estado === 'aceptada' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {solicitud.estado.toUpperCase()}
                      </span>
                    </div>
                    {solicitud.estado === 'pendiente' && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => cancelarSolicitud(solicitud.id)}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                        >
                          Cancelar Solicitud
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botón configuración */}
      <div className="fixed bottom-6 left-6">
        <button onClick={() => navigate("/configuracion")} className="bg-gray-700 text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition">
          <FaCog />
        </button>
      </div>

      {/* MODAL HORARIO */}
      {mostrarModalHorario && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-11/12 md:w-96 shadow-lg relative">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 flex items-center gap-2">
              <FaPlus className="text-[#f36d6d]" /> {modoEdicionHorario ? "Editar Horario" : "Nuevo Horario"}
            </h2>

            <div className="grid grid-cols-1 gap-3">
              <select
                className="border p-2 rounded"
                value={nuevoHorario.dia_semana}
                onChange={(e) => setNuevoHorario({ ...nuevoHorario, dia_semana: e.target.value })}
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
                value={nuevoHorario.hora_aproximada}
                onChange={(e) => setNuevoHorario({ ...nuevoHorario, hora_aproximada: e.target.value })}
              />

              <select
                className="border p-2 rounded"
                value={nuevoHorario.origen}
                onChange={(e) => setNuevoHorario({ ...nuevoHorario, origen: e.target.value })}
              >
                <option value="">Seleccionar origen</option>
                <option value="universidad">Universidad</option>
                <option value="residencia">Residencia</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setMostrarModalHorario(false); setModoEdicionHorario(false); }} className="px-4 py-2 border rounded-lg">Cancelar</button>
              <button onClick={guardarHorario} className="px-4 py-2 bg-[#f36d6d] text-white rounded-lg hover:bg-[#e65454]">
                {modoEdicionHorario ? "Actualizar" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePasajero;