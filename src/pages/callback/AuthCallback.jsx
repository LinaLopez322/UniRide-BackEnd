import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../SupabaseClient";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    verificarAutenticacion();
  }, []);

  const verificarAutenticacion = async () => {
    try {
      // Obtener el usuario autenticado
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setError("Error en la autenticación");
        setTimeout(() => navigate("/"), 2000);
        return;
      }

      // Verificar que sea correo institucional
      if (!user.email.endsWith("@correounivalle.edu.co")) {
        await supabase.auth.signOut();
        setError("Solo se permiten correos institucionales de @correounivalle.edu.co");
        setTimeout(() => navigate("/"), 3000);
        return;
      }

      // Verificar si ya tiene perfil
      const { data: perfilExistente, error: perfilError } = await supabase
        .from("perfiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (perfilError && perfilError.code !== "PGRST116") {
        console.error("Error al verificar perfil:", perfilError);
      }

      if (perfilExistente) {
        // Ya tiene perfil, ir al home
        navigate("/home");
      } else {
        // No tiene perfil, ir a selección de rol
        navigate("/seleccion-rol");
      }
    } catch (error) {
      console.error("Error en callback:", error);
      setError("Ocurrió un error. Redirigiendo...");
      setTimeout(() => navigate("/"), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f36d6d]">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <img src="/img/Logo.jpg" alt="UniRide" className="w-24 mx-auto mb-6" />
        
        {error ? (
          <>
            <div className="text-red-500 text-xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Error</h2>
            <p className="text-gray-600">{error}</p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#f36d6d] mx-auto mb-6"></div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Verificando...</h2>
            <p className="text-gray-600">Por favor espera un momento</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;