import { useState, useEffect } from "react";
import { FaGoogle, FaUser, FaLock } from "react-icons/fa6";
import { supabase } from "../SupabaseClient.js";

const Autenticacion = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [mostrarRegistro, setMostrarRegistro] = useState(false);
    const [mensaje, setMensaje] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");

        // Validar dominio antes de intentar login
        if (!email.endsWith("@correounivalle.edu.co")) {
            setError("Solo se permiten correos institucionales de Univalle");
            return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError("Correo o contraseña incorrectos");
            return;
        }

        window.location.href = "/home";
    };

    const handleRegistro = async (e) => {
        e.preventDefault();
        setError("");
        setMensaje("");

        // Validar dominio
        if (!email.endsWith("@correounivalle.edu.co")) {
            setError("Solo se permiten correos institucionales de Univalle");
            return;
        }

        // Validar contraseña
        if (password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/seleccion-rol`,
            },
        });

        if (error) {
            setError(error.message);
            return;
        }

        setMensaje("¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.");
        setTimeout(() => {
            setMostrarRegistro(false);
            setMensaje("");
        }, 3000);
    };

    const handleGoogleLogin = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth-callback`,
            },
        });

        if (error) {
            console.error("Error en Google Login:", error.message);
            setError("No se pudo iniciar sesión con Google");
        }
    };

    useEffect(() => {
        const verificarCorreo = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                const correo = user.email || "";
                if (correo.endsWith("@correounivalle.edu.co")) {
                    window.location.href = "/home";
                } else {
                    await supabase.auth.signOut();
                    setError("Solo se permiten correos de @correounivalle.edu.co");
                }
            }
        };

        verificarCorreo();
    }, []);

    return (
        <div className="min-h-screen flex justify-center items-center bg-[#f36d6d]">
            <div className="flex w-[900px] h-[500px] bg-[#f36d6d] rounded-3xl shadow-[15px_15px_0px_#e65454] overflow-hidden">
                {/* Panel Izquierdo */}
                <div className="w-1/2 bg-white flex flex-col justify-center items-center p-8 rounded-l-3xl shadow-lg">
                    <img src="img/Logo.jpg" alt="UniRide Logo" className="w-32 mb-3" />
                    <h2 className="text-center text-lg font-semibold text-gray-700 mb-1">
                        ¡COMIENZA TU VIAJE AQUÍ!
                    </h2>
                    <h3 className="text-sm font-bold mb-6 text-gray-800">
                        {mostrarRegistro ? "REGISTRO" : "INICIO DE SESIÓN"}
                    </h3>

                    <form
                        className="w-full flex flex-col items-center space-y-3"
                        onSubmit={mostrarRegistro ? handleRegistro : handleLogin}
                    >
                        <div className="relative w-3/4">
                            <input
                                type="email"
                                placeholder="Correo"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full border rounded-md px-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
                                required
                            />
                            <FaUser className="absolute left-3 top-3 text-gray-400" />
                        </div>

                        <div className="relative w-3/4">
                            <input
                                type="password"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full border rounded-md px-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
                                required
                            />
                            <FaLock className="absolute left-3 top-3 text-gray-400" />
                        </div>

                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        {mensaje && <p className="text-green-500 text-sm">{mensaje}</p>}

                        <button
                            type="submit"
                            className="w-3/4 bg-[#f35e5e] text-white font-semibold py-2 rounded-full hover:bg-[#e65353] transition"
                        >
                            {mostrarRegistro ? "REGISTRARSE" : "INGRESAR"}
                        </button>

                        <div className="flex items-center my-4">
                            <hr className="flex-grow border-gray-500" />
                            <span className="px-2 text-gray-500 text-sm">O</span>
                            <hr className="flex-grow border-gray-500" />
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            className="w-3/4 border text-gray-700 font-medium flex items-center justify-center gap-2 py-2 rounded-md hover:bg-gray-100 transition"
                        >
                            <FaGoogle className="text-red-500" />
                            {mostrarRegistro ? "Regístrate con Google" : "Inicia Sesión con Google"}
                        </button>
                    </form>

                    {!mostrarRegistro && (
                        <div className="mt-3 text-center text-xs">
                            <a href="#" className="text-gray-500 hover:text-red-400">
                                ¿Olvidaste la contraseña?
                            </a>
                        </div>
                    )}

                    <div className="text-center text-xs mt-2">
                        {mostrarRegistro ? (
                            <>
                                ¿Ya tienes cuenta?{" "}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMostrarRegistro(false);
                                        setError("");
                                        setMensaje("");
                                    }}
                                    className="text-blue-600 hover:underline"
                                >
                                    Inicia Sesión
                                </button>
                            </>
                        ) : (
                            <>
                                ¿No tienes cuenta?{" "}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMostrarRegistro(true);
                                        setError("");
                                        setMensaje("");
                                    }}
                                    className="text-blue-600 hover:underline"
                                >
                                    Regístrate
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Panel Derecho */}
                <div className="w-1/2 relative rounded-r-3xl overflow-hidden">
                    <img
                        src="img/imgAuth.jpg"
                        alt="Carpool"
                        className="w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 flex flex-col justify-center items-center text-center px-8 text-white">
                        <h1 className="text-xl font-semibold mb-3">
                            Tu compañero de ruta al campus
                        </h1>
                        <h2 className="text-sm font-light leading-relaxed">
                            CONDUCE CON TUS COMPAÑEROS <br />
                            O ENCUENTRA TU CONDUCTOR FAVORITO EN UN SOLO LUGAR
                        </h2>

                        <span className="mt-8 text-xs bg-black bg-opacity-30 px-3 py-1 rounded border border-blue-400">
                            Leer antes de usar: para fomentar la seguridad, la aplicación solo
                            permite correos de la Universidad del Valle
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Autenticacion;