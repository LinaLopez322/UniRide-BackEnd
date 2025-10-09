import { useEffect, useState } from "react";
import { supabase } from "../../SupabaseClient.js";

const AuthCallback = () => {
    const [mensaje, setMensaje] = useState("Verificando tu cuenta...");
    const [usuario, setUsuario] = useState(null);
    const [formData, setFormData] = useState({
        edad: "",
        sexo: "",
        codigo_estudiante: "",
        carrera: "",
    });
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        const verificarUsuario = async () => {
            const {
                data: { user },
                error,
            } = await supabase.auth.getUser();

            if (error) {
                console.error("Error obteniendo usuario:", error.message);
                setMensaje("Error verificando tu sesión. Intenta nuevamente.");
                return;
            }

            if (user) {
                const correo = user.email || "";
                const nombre = user.user_metadata.full_name || "";
                const foto = user.user_metadata.avatar_url || "";

                // 🔒 Solo correos de Univalle
                if (!correo.endsWith("@correounivalle.edu.co")) {
                    await supabase.auth.signOut();
                    setMensaje("Solo se permiten correos de @correounivalle.edu.co");
                    return;
                }

                // Verificar si el usuario ya existe
                const { data: existente, error: selectError } = await supabase
                    .from("usuarios")
                    .select("*")
                    .eq("correo", correo)
                    .maybeSingle();

                if (selectError) {
                    console.error("Error buscando usuario:", selectError.message);
                    setMensaje("Error al verificar tu información.");
                    return;
                }

                if (!existente || !existente.edad || !existente.carrera) {
                    // Si no existe o no ha llenado su perfil, mostrar formulario
                    setUsuario({ correo, nombre, foto });
                    setMensaje("");
                } else {
                    // Si ya está completo, redirigir directo
                    window.location.href = "/home";
                }
            } else {
                setMensaje("No se detectó sesión activa.");
            }
        };

        verificarUsuario();
    }, []);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGuardando(true);

        const { error } = await supabase
            .from("usuarios")
            .upsert(
                {
                    correo: usuario.correo,
                    nombre: usuario.nombre,
                    foto: usuario.foto,
                    edad: formData.edad,
                    sexo: formData.sexo,
                    codigo_estudiante: formData.codigo_estudiante,
                    carrera: formData.carrera,
                },
                { onConflict: "correo" }
            );

        if (error) {
            console.error("Error guardando datos:", error.message);
            setMensaje("Hubo un error al guardar tus datos. Intenta de nuevo.");
            setGuardando(false);
            return;
        }

        setGuardando(false);
        window.location.href = "/home";
    };

    if (mensaje && !usuario) {
        return (
            <div className="min-h-screen flex flex-col justify-center items-center bg-[#f36d6d] text-white text-center">
                <img src="/img/Logo.jpg" alt="Logo" className="w-24 mb-4" />
                <h1 className="text-lg font-semibold mb-2">{mensaje}</h1>
                <p className="text-sm opacity-80">Por favor, espera un momento...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col justify-center items-center bg-[#f36d6d]">
            <div className="bg-white p-8 rounded-3xl shadow-lg w-[400px] text-gray-800">
                <div className="flex flex-col items-center mb-4">
                    <img
                        src={usuario?.foto}
                        alt="Foto de perfil"
                        className="w-20 h-20 rounded-full mb-3"
                    />
                    <h2 className="font-semibold text-lg text-center">{usuario?.nombre}</h2>
                    <p className="text-sm text-gray-500">{usuario?.correo}</p>
                </div>

                <h3 className="text-center text-md font-bold mb-4 text-[#f35e5e]">
                    Completa tu información
                </h3>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium">Edad</label>
                        <input
                            type="number"
                            name="edad"
                            value={formData.edad}
                            onChange={handleChange}
                            required
                            className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-red-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Sexo</label>
                        <select
                            name="sexo"
                            value={formData.sexo}
                            onChange={handleChange}
                            required
                            className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-red-400"
                        >
                            <option value="">Selecciona una opción</option>
                            <option value="Masculino">Masculino</option>
                            <option value="Femenino">Femenino</option>
                            <option value="Otro">Otro</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Código de estudiante</label>
                        <input
                            type="text"
                            name="codigo_estudiante"
                            value={formData.codigo_estudiante}
                            onChange={handleChange}
                            required
                            className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-red-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Carrera</label>
                        <input
                            type="text"
                            name="carrera"
                            value={formData.carrera}
                            onChange={handleChange}
                            required
                            className="w-full border rounded-md px-3 py-2 mt-1 focus:outline-none focus:ring-1 focus:ring-red-400"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={guardando}
                        className="w-full bg-[#f35e5e] text-white py-2 rounded-md mt-4 hover:bg-[#e65353] transition"
                    >
                        {guardando ? "Guardando..." : "Guardar y continuar"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AuthCallback;
