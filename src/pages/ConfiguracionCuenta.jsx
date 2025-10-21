import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../SupabaseClient";
import { 
  FaUser, FaPhone, FaEnvelope, FaLock, FaTrash, 
  FaArrowLeft, FaCamera, FaSave, FaExclamationTriangle 
} from "react-icons/fa";

const ConfiguracionCuenta = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  // Estados para edición
  const [datosPerfil, setDatosPerfil] = useState({
    nombre_completo: "",
    telefono: "",
  });

  const [cambioPassword, setCambioPassword] = useState({
    passwordActual: "",
    passwordNueva: "",
    passwordConfirm: "",
  });

  // Estados para eliminar cuenta
  const [showModalEliminar, setShowModalEliminar] = useState(false);
  const [confirmacionEmail, setConfirmacionEmail] = useState("");
  const [motivoEliminacion, setMotivoEliminacion] = useState("");
  const [aceptoTerminos, setAceptoTerminos] = useState(false);

  const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
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

      if (perfilData) {
        setPerfil(perfilData);
        setDatosPerfil({
          nombre_completo: perfilData.nombre_completo || "",
          telefono: perfilData.telefono || "",
        });
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const mostrarMensaje = (tipo, texto) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje({ tipo: "", texto: "" }), 5000);
  };

  const guardarPerfil = async (e) => {
    e.preventDefault();
    setGuardando(true);

    try {
      // Validar teléfono (10 dígitos)
      if (datosPerfil.telefono && !/^\d{10}$/.test(datosPerfil.telefono)) {
        mostrarMensaje("error", "El teléfono debe tener 10 dígitos");
        setGuardando(false);
        return;
      }

      const { error } = await supabase
        .from("perfiles")
        .update({
          nombre_completo: datosPerfil.nombre_completo,
          telefono: datosPerfil.telefono,
        })
        .eq("id", user.id);

      if (error) throw error;

      mostrarMensaje("success", "Perfil actualizado correctamente");
      await cargarDatos();
    } catch (error) {
      console.error("Error:", error);
      mostrarMensaje("error", "Error al actualizar el perfil");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPassword = async (e) => {
    e.preventDefault();

    // Validaciones
    if (cambioPassword.passwordNueva.length < 6) {
      mostrarMensaje("error", "La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (cambioPassword.passwordNueva !== cambioPassword.passwordConfirm) {
      mostrarMensaje("error", "Las contraseñas no coinciden");
      return;
    }

    setGuardando(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: cambioPassword.passwordNueva,
      });

      if (error) throw error;

      mostrarMensaje("success", "Contraseña actualizada correctamente");
      setCambioPassword({
        passwordActual: "",
        passwordNueva: "",
        passwordConfirm: "",
      });
    } catch (error) {
      console.error("Error:", error);
      mostrarMensaje("error", "Error al cambiar la contraseña");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarCuenta = async () => {
    // Validaciones
    if (confirmacionEmail !== user.email) {
      mostrarMensaje("error", "El correo no coincide");
      return;
    }

    if (!aceptoTerminos) {
      mostrarMensaje("error", "Debes aceptar que entiendes las consecuencias");
      return;
    }

    if (!confirm("¿Estás ABSOLUTAMENTE seguro? Esta acción no se puede deshacer.")) {
      return;
    }

    setEliminando(true);

    try {
      // Llamar función de base de datos para marcar cuenta como eliminada (soft delete)
      const { error: dbError } = await supabase.rpc("eliminar_cuenta_usuario", {
        user_id_param: user.id,
        motivo_param: motivoEliminacion || null,
      });

      if (dbError) throw dbError;

      // Cerrar sesión
      const { error: authError } = await supabase.auth.signOut();

      if (authError) throw authError;

      // Redirigir a página de inicio con mensaje
      alert("Tu cuenta ha sido desactivada. Ya no podrás acceder con estas credenciales. Si deseas reactivarla, contacta al soporte.");
      navigate("/");
    } catch (error) {
      console.error("Error:", error);
      mostrarMensaje("error", "Error al eliminar la cuenta. Intenta de nuevo.");
      setEliminando(false);
    }
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
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/home")}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <FaArrowLeft className="text-xl text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Configuración de Cuenta</h1>
            <p className="text-sm text-gray-600">Gestiona tu información personal</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Mensajes */}
        {mensaje.texto && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              mensaje.tipo === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
          >
            {mensaje.texto}
          </div>
        )}

        {/* Información de la cuenta */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaUser className="text-[#f36d6d]" />
            Información de la Cuenta
          </h2>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <FaEnvelope className="text-2xl text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Correo electrónico</p>
                <p className="font-semibold text-gray-800">{user?.email}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Este correo no se puede cambiar (correo institucional)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
              <FaUser className="text-2xl text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Rol en la plataforma</p>
                <p className="font-semibold text-gray-800 capitalize">
                  {perfil?.rol || "No definido"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Editar Perfil */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaSave className="text-[#f36d6d]" />
            Editar Perfil
          </h2>

          <form onSubmit={guardarPerfil} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre completo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={datosPerfil.nombre_completo}
                onChange={(e) =>
                  setDatosPerfil({ ...datosPerfil, nombre_completo: e.target.value })
                }
                placeholder="Tu nombre completo"
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#f36d6d]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={datosPerfil.telefono}
                onChange={(e) =>
                  setDatosPerfil({ ...datosPerfil, telefono: e.target.value.replace(/\D/g, "") })
                }
                placeholder="3001234567"
                maxLength="10"
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#f36d6d]"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {perfil?.rol === "conductor"
                  ? "Los pasajeros te contactarán a este número"
                  : "Los conductores te contactarán a este número"}
              </p>
            </div>

            <button
              type="submit"
              disabled={guardando}
              className={`w-full py-3 rounded-lg font-semibold text-white transition flex items-center justify-center gap-2 ${
                guardando
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#f36d6d] hover:bg-[#e65454]"
              }`}
            >
              <FaSave />
              {guardando ? "Guardando..." : "Guardar Cambios"}
            </button>
          </form>
        </div>

        {/* Cambiar Contraseña */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FaLock className="text-[#f36d6d]" />
            Cambiar Contraseña
          </h2>

          <form onSubmit={cambiarPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nueva contraseña <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={cambioPassword.passwordNueva}
                onChange={(e) =>
                  setCambioPassword({ ...cambioPassword, passwordNueva: e.target.value })
                }
                placeholder="Mínimo 6 caracteres"
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#f36d6d]"
                minLength="6"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar contraseña <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={cambioPassword.passwordConfirm}
                onChange={(e) =>
                  setCambioPassword({ ...cambioPassword, passwordConfirm: e.target.value })
                }
                placeholder="Repite la contraseña"
                className="w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#f36d6d]"
              />
            </div>

            <button
              type="submit"
              disabled={guardando}
              className={`w-full py-3 rounded-lg font-semibold text-white transition flex items-center justify-center gap-2 ${
                guardando
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600"
              }`}
            >
              <FaLock />
              {guardando ? "Actualizando..." : "Cambiar Contraseña"}
            </button>
          </form>
        </div>

        {/* Zona de Peligro */}
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-red-800 mb-2 flex items-center gap-2">
            <FaExclamationTriangle className="text-red-600" />
            Zona de Peligro
          </h2>
          <p className="text-sm text-gray-700 mb-4">
            Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, estate seguro.
          </p>

          <button
            onClick={() => setShowModalEliminar(true)}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2"
          >
            <FaTrash />
            Eliminar mi cuenta
          </button>
        </div>
      </div>

      {/* Modal Eliminar Cuenta */}
      {showModalEliminar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaExclamationTriangle className="text-3xl text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">
                ¿Eliminar tu cuenta?
              </h3>
              <p className="text-gray-600">
                Esta acción es <strong>permanente</strong> y no se puede deshacer.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-yellow-900 mb-2">
                Se eliminarán permanentemente:
              </h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>✗ Tu perfil y toda tu información personal</li>
                <li>✗ Todos tus horarios {perfil?.rol === "conductor" ? "y vehículo registrado" : ""}</li>
                <li>✗ Tu historial de contactos</li>
                <li>✗ Tus favoritos</li>
                <li>✗ Tu acceso a la plataforma</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motivo de eliminación (opcional)
                </label>
                <textarea
                  value={motivoEliminacion}
                  onChange={(e) => setMotivoEliminacion(e.target.value)}
                  placeholder="Cuéntanos por qué te vas..."
                  rows="3"
                  className="w-full border rounded-lg px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirma escribiendo tu correo: <strong>{user?.email}</strong>
                </label>
                <input
                  type="email"
                  value={confirmacionEmail}
                  onChange={(e) => setConfirmacionEmail(e.target.value)}
                  placeholder="tu-correo@correounivalle.edu.co"
                  className="w-full border rounded-lg px-4 py-3"
                />
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="aceptoTerminos"
                  checked={aceptoTerminos}
                  onChange={(e) => setAceptoTerminos(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="aceptoTerminos" className="text-sm text-gray-700">
                  Entiendo que esta acción es permanente y que todos mis datos serán
                  eliminados sin posibilidad de recuperación.
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModalEliminar(false);
                  setConfirmacionEmail("");
                  setMotivoEliminacion("");
                  setAceptoTerminos(false);
                }}
                className="flex-1 px-4 py-3 border rounded-lg hover:bg-gray-50 transition font-semibold"
                disabled={eliminando}
              >
                Cancelar
              </button>
              <button
                onClick={eliminarCuenta}
                disabled={eliminando || !aceptoTerminos || confirmacionEmail !== user?.email}
                className={`flex-1 px-4 py-3 rounded-lg font-semibold text-white transition ${
                  eliminando || !aceptoTerminos || confirmacionEmail !== user?.email
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {eliminando ? "Eliminando..." : "Sí, eliminar mi cuenta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfiguracionCuenta;