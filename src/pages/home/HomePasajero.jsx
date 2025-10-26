import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../SupabaseClient.js";
import { FaClock, FaPlus, FaTrash, FaWhatsapp, FaPhone, FaCar, FaMapMarkerAlt, FaStar, FaRegStar, FaFilter, FaUser, FaHistory } from "react-icons/fa";

const HomePasajero = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [conductores, setConductores] = useState([]);
  const [conductoresFiltrados, setConductoresFiltrados] = useState([]);
  const [favoritos, setFavoritos] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vistaActual, setVistaActual] = useState("buscar");

  // Filtros
  const [filtros, setFiltros] = useState({
    dia_semana: "",
    zona_residencia: "",
    origen: "",
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

      if (!perfilData || perfilData.rol !== "pasajero") {
        navigate("/");
        return;
      }

      setPerfil(perfilData);

      await Promise.all([
        cargarConductores(),
        cargarFavoritos(user.id),
        cargarHistorial(user.id),
      ]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const cargarConductores = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("perfiles")
        .select(`
          id,
          nombre_completo,
          email,
          telefono,
          foto_perfil,
          rol,
          horarios_conductor!inner (
            id,
            dia_semana,
            hora_salida,
            origen,
            destino,
            zona_residencia,
            activo
          ),
          vehiculos (
            marca,
            modelo,
            color,
            placa,
            anio
          )
        `)
        .eq("rol", "conductor")
        .eq("horarios_conductor.activo", true);

      if (error) {
        console.error("Error cargando conductores:", error.message);
        setConductores([]);
        return;
      }

      if (!data || data.length === 0) {
        console.warn("No se encontraron conductores activos con horarios válidos.");
        setConductores([]);
        return;
      }

      // Filtrar conductores que tengan al menos un horario activo
      const conductoresActivos = data.filter((c) =>
        c.horarios_conductor?.some((h) => h.activo)
      );

      // Formatear datos para coincidir con la estructura del primer código
      const conductoresFormateados = conductoresActivos.map(conductor => ({
        ...conductor,
        perfiles: {
          id: conductor.id,
          nombre_completo: conductor.nombre_completo,
          email: conductor.email,
          telefono: conductor.telefono,
          foto_perfil: conductor.foto_perfil
        },
        horarios: conductor.horarios_conductor || []
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
        .select(`
          *,
          perfiles!conductores_favoritos_conductor_id_fkey (
            id, nombre_completo, email, telefono
          )
        `)
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
        .select(`
          *,
          perfiles!historial_contactos_conductor_id_fkey (
            nombre_completo, email, telefono
          )
        `)
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
      const esFavorito = favoritos.some(f => f.conductor_id === conductorId);

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
      const { error } = await supabase
        .from("historial_contactos")
        .insert({
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
      filtrados = filtrados.filter(c => 
        c.horarios.some(h => h.dia_semana === filtros.dia_semana)
      );
    }

    if (filtros.zona_residencia) {
      filtrados = filtrados.filter(c =>
        c.horarios.some(h => 
          h.zona_residencia?.toLowerCase().includes(filtros.zona_residencia.toLowerCase())
        )
      );
    }

    if (filtros.origen) {
      filtrados = filtrados.filter(c =>
        c.horarios.some(h => h.origen === filtros.origen)
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

  // Función para formatear el número de teléfono
  const formatearTelefono = (telefono) => {
    if (!telefono) return "Sin teléfono";
    
    // Eliminar cualquier carácter que no sea número
    const soloNumeros = telefono.replace(/\D/g, '');
    
    // Formatear como +57 300 123 4567
    if (soloNumeros.length === 10) {
      return `+57 ${soloNumeros.substring(0, 3)} ${soloNumeros.substring(3, 6)} ${soloNumeros.substring(6)}`;
    } else if (soloNumeros.length > 10) {
      return `+${soloNumeros}`;
    }
    
    return telefono;
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
            <button
              className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 transition"
            >
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
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Vista: Buscar Conductores */}
        {vistaActual === "buscar" && (
          <div>
            {/* Filtros */}
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

            {/* Lista de conductores */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold mb-6">
                Conductores Disponibles ({conductoresFiltrados.length})
              </h2>

              {conductoresFiltrados.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FaCar className="text-6xl mx-auto mb-4 text-gray-300" />
                  <p>No hay conductores disponibles</p>
                  <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {conductoresFiltrados.map((conductor, idx) => {
                    const esFavorito = favoritos.some(f => f.conductor_id === conductor.perfiles.id);
                    const vehiculo = conductor.vehiculos?.[0];

                    return (
                      <div key={idx} className="border rounded-lg p-6 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                              {conductor.perfiles.foto_perfil ? (
                                <img 
                                  src={conductor.perfiles.foto_perfil} 
                                  alt="Perfil"
                                  className="w-full h-full rounded-full object-cover"
                                />
                              ) : (
                                <FaUser className="text-3xl text-gray-400" />
                              )}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-800">
                                {conductor.perfiles.nombre_completo || "Conductor"}
                              </h3>
                              <p className="text-sm text-gray-600">{conductor.perfiles.email}</p>
                              
                              {/* Número de teléfono visible */}
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

                          <button
                            onClick={() => toggleFavorito(conductor.perfiles.id)}
                            className="text-2xl transition"
                          >
                            {esFavorito ? (
                              <FaStar className="text-yellow-500" />
                            ) : (
                              <FaRegStar className="text-gray-400 hover:text-yellow-500" />
                            )}
                          </button>
                        </div>

                        {/* Horarios del conductor */}
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
                              {h.zona_residencia && (
                                <span className="text-xs text-gray-500">({h.zona_residencia})</span>
                              )}
                            </div>
                          ))}
                          {conductor.horarios.length > 3 && (
                            <p className="text-xs text-gray-500">
                              +{conductor.horarios.length - 3} horarios más
                            </p>
                          )}
                        </div>

                        {/* Botones de contacto */}
                        {conductor.perfiles.telefono && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => contactarWhatsApp(conductor)}
                              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                            >
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
          </div>
        )}

        {/* Vista: Favoritos */}
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
                        <h3 className="font-bold text-gray-800">
                          {fav.perfiles.nombre_completo || "Conductor"}
                        </h3>
                        <p className="text-sm text-gray-600">{fav.perfiles.email}</p>
                        
                        {/* Número de teléfono en favoritos */}
                        <div className="mt-1 flex items-center gap-2">
                          <FaPhone className="text-green-500 text-sm" />
                          <span className="text-sm font-medium text-gray-700">
                            {formatearTelefono(fav.perfiles.telefono)}
                          </span>
                        </div>
                        
                        {fav.notas && (
                          <p className="text-sm text-gray-500 mt-2 italic">{fav.notas}</p>
                        )}
                      </div>
                      <button
                        onClick={() => toggleFavorito(fav.conductor_id)}
                        className="text-yellow-500 text-xl hover:text-gray-400"
                      >
                        <FaStar />
                      </button>
                    </div>
                    {fav.perfiles.telefono && (
                      <div className="flex gap-2 mt-3">
                        <a
                          href={`https://wa.me/57${fav.perfiles.telefono}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                        >
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

        {/* Vista: Historial */}
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
                        <p className="font-semibold text-gray-800">
                          {contacto.perfiles.nombre_completo || "Conductor"}
                        </p>
                        <p className="text-sm text-gray-600">{contacto.perfiles.email}</p>
                        
                        {/* Número de teléfono en historial */}
                        {contacto.perfiles.telefono && (
                          <div className="mt-1 flex items-center gap-2">
                            <FaPhone className="text-green-500 text-xs" />
                            <span className="text-xs font-medium text-gray-700">
                              {formatearTelefono(contacto.perfiles.telefono)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-sm">
                          {contacto.tipo_contacto === "whatsapp" ? (
                            <FaWhatsapp className="text-green-500" />
                          ) : (
                            <FaPhone className="text-blue-500" />
                          )}
                          <span className="capitalize text-gray-600">{contacto.tipo_contacto}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(contacto.created_at).toLocaleDateString("es-CO", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePasajero;