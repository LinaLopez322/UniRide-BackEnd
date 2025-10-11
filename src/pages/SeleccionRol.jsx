import { useState } from "react";
import { useNavigate } from "react-router";
import { FaCar, FaUserFriends } from "react-icons/fa";
import { supabase } from "../SupabaseClient";

const SeleccionRol = () => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRoleSelection = async () => {
    if (!selectedRole) return;

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        alert("No estás autenticado");
        navigate("/");
        return;
      }

      // Crear perfil con el rol seleccionado
      const { error } = await supabase.from("perfiles").insert({
        id: user.id,
        email: user.email,
        rol: selectedRole,
        nombre_completo: user.user_metadata?.full_name || null,
        foto_perfil: user.user_metadata?.avatar_url || null,
      });

      if (error) throw error;

      // Redirigir según el rol
      if (selectedRole === "conductor") {
        navigate("/registro-conductor");
      } else {
        navigate("/home");
      }
    } catch (error) {
      console.error("Error al guardar rol:", error);
      alert("Error al registrar tu rol. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-[#f36d6d] to-[#e65454]">
      <div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl w-full">
        <div className="text-center mb-8">
          <img src="/img/Logo.jpg" alt="UniRide" className="w-24 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            ¡Bienvenido a UniRide!
          </h1>
          <p className="text-gray-600">
            Selecciona cómo quieres usar la plataforma
          </p>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Opción Conductor */}
          <button
            onClick={() => setSelectedRole("conductor")}
            className={`p-6 border-2 rounded-xl transition-all duration-300 hover:scale-105 ${
              selectedRole === "conductor"
                ? "border-[#f36d6d] bg-red-50 shadow-lg"
                : "border-gray-300 hover:border-[#f36d6d]"
            }`}
          >
            <FaCar
              className={`text-6xl mx-auto mb-4 ${
                selectedRole === "conductor" ? "text-[#f36d6d]" : "text-gray-400"
              }`}
            />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Conductor</h3>
            <p className="text-sm text-gray-600">
              Comparte tu vehículo y gana dinero en tus trayectos
            </p>
          </button>

          {/* Opción Pasajero */}
          <button
            onClick={() => setSelectedRole("pasajero")}
            className={`p-6 border-2 rounded-xl transition-all duration-300 hover:scale-105 ${
              selectedRole === "pasajero"
                ? "border-[#f36d6d] bg-red-50 shadow-lg"
                : "border-gray-300 hover:border-[#f36d6d]"
            }`}
          >
            <FaUserFriends
              className={`text-6xl mx-auto mb-4 ${
                selectedRole === "pasajero" ? "text-[#f36d6d]" : "text-gray-400"
              }`}
            />
            <h3 className="text-xl font-bold text-gray-800 mb-2">Pasajero</h3>
            <p className="text-sm text-gray-600">
              Encuentra conductores confiables para tus trayectos
            </p>
          </button>
        </div>

        <button
          onClick={handleRoleSelection}
          disabled={!selectedRole || loading}
          className={`w-full py-3 rounded-full font-semibold text-white transition-all ${
            selectedRole && !loading
              ? "bg-[#f36d6d] hover:bg-[#e65454] cursor-pointer"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          {loading ? "Procesando..." : "Continuar"}
        </button>

        <p className="text-center text-sm text-gray-500 mt-6">
          Podrás cambiar tu rol más adelante desde tu perfil
        </p>
      </div>
    </div>
  );
};

export default SeleccionRol;