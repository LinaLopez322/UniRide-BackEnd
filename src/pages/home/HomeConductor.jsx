import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../SupabaseClient";
import {
  FaClock,
  FaPlus,
  FaTrash,
  FaCar,
  FaUser,
  FaMapMarkerAlt,
} from "react-icons/fa";

const HomeConductor = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [misHorarios, setMisHorarios] = useState([]);
  const [loading, setLoading] = useState(true);

  // ------------------- FUNCIONES -------------------

  async function obtenerMisHorarios(id) {
    try {
      const { data, error } = await supabase
        .from("horarios_conductor")
        .select("*")
        .eq("conductor_id", id)
        .eq("activo", true);

      if (error) {
        console.error("Error obteniendo mis horarios:", error);
        return;
      }

      setMisHorarios(data || []);
    } catch (error) {
      console.error("Error en obtenerMisHorarios:", error);
    }
  }

  // ------------------- VERIFICAR AUTENTICACIÓN -------------------

  useEffect(() => {
    const verificarAutenticacion = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/");
          return;
        }

        setUserId(user.id);

        const { data: perfilData, error: errPerfil } = await supabase
          .from("perfiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (errPerfil) {
          console.error("Error cargando perfil:", errPerfil);
          navigate("/");
          return;
        }

        if (!perfilData || perfilData.rol !== "conductor") {
          navigate("/");
          return;
        }

        setPerfil(perfilData);

        await obtenerMisHorarios(user.id);
      } catch (error) {
        console.error("Error verificando autenticación:", error);
      } finally {
        setLoading(false);
      }
    };

    verificarAutenticacion();
  }, [navigate]);

  // ------------------- ELIMINAR HORARIO -------------------

  const eliminarHorario = async (id) => {
    const { error } = await supabase
      .from("horarios_conductor")
      .update({ activo: false })
      .eq("id", id);

    if (error) {
      console.error("Error eliminando horario:", error.message);
      return;
    }

    await obtenerMisHorarios(userId);
  };

  // ------------------- CERRAR SESIÓN -------------------

  const cerrarSesion = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    }
  };

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
      {/* HEADER */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/img/Logo.jpg" alt="UniRide" className="w-12 h-12" />
            <div>
              <h1 className="text-xl font-bold text-gray-800">UniRide</h1>
              <p className="text-sm text-gray-600">Modo Conductor</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-2 px-3 py-2 border rounded-lg hover:bg-gray-50 transition">
              <FaUser className="text-gray-600" />
              <span className="text-sm">
                {perfil?.nombre_completo || "Perfil"}
              </span>
            </button>
            <button
              onClick={cerrarSesion}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FaCar className="text-[#f36d6d]" /> Mis Horarios Activos
            </h2>
            <button
              onClick={() => navigate("/registro-horario-conductor")}
              className="bg-[#f36d6d] hover:bg-[#e65454] text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <FaPlus /> Nuevo Horario
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FaClock className="text-[#f36d6d]" /> Tus horarios disponibles
          </h3>

          {misHorarios.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FaClock className="text-6xl mx-auto mb-4 text-gray-300" />
              <p>No tienes horarios activos</p>
              <p className="text-sm">
                Crea tu primer horario para empezar a recibir coincidencias
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {misHorarios.map((h) => (
                <div
                  key={h.id}
                  className="border border-gray-200 rounded-lg p-6 flex justify-between items-center hover:shadow-md transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold">
                        {(h.dia_semana || "").toString().toUpperCase()}
                      </span>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                        {h.hora_salida}
                      </span>
                    </div>
                    <p className="text-gray-800 font-medium flex items-center gap-2">
                      <FaMapMarkerAlt className="text-[#f36d6d]" />
                      {h.origen} → {h.destino}
                    </p>
                    {h.zona_residencia && (
                      <p className="text-sm text-gray-600 mt-1">
                        Zona: {h.zona_residencia}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => eliminarHorario(h.id)}
                    className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition"
                    title="Eliminar horario"
                  >
                    <FaTrash size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomeConductor;

