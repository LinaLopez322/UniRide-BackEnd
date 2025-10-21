import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../SupabaseClient";
import HomeConductor from "./HomeConductor";
import HomePasajero from "./HomePasajero";

const Home = () => {
  const navigate = useNavigate();
  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verificarRol();
  }, []);

  const verificarRol = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/");
        return;
      }

      const { data: perfilData } = await supabase
        .from("perfiles")
        .select("rol")
        .eq("id", user.id)
        .single();

      if (!perfilData) {
        navigate("/seleccion-rol");
        return;
      }

      setRol(perfilData.rol);
    } catch (error) {
      console.error("Error:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#f36d6d] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  // Renderizar componente según el rol
  if (rol === "conductor") {
    return <HomeConductor />;
  } else if (rol === "pasajero") {
    return <HomePasajero />;
  }

  return null;
};

export default Home;