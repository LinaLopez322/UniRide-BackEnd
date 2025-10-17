import { useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../SupabaseClient";
import { FaUpload, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

const RegistroConductor = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    placa: "",
    marca: "",
    modelo: "",
    color: "",
    anio: "",
    capacidad_pasajeros: 4,
  });

  const [documentos, setDocumentos] = useState({
    tarjeta_propiedad: null,
    licencia_conducir: null,
    soat: null,
  });

  const [uploadStatus, setUploadStatus] = useState({
    tarjeta_propiedad: false,
    licencia_conducir: false,
    soat: false,
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e, docType) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert("El archivo no puede superar los 5MB");
        return;
      }
      // Validar tipo
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        alert("Solo se permiten archivos JPG, PNG o PDF");
        return;
      }
      setDocumentos({ ...documentos, [docType]: file });
      setUploadStatus({ ...uploadStatus, [docType]: true });
    }
  };

  const uploadFile = async (file, path) => {
    const { data, error } = await supabase.storage
      .from("documentos-vehiculos")
      .upload(path, file, { upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from("documentos-vehiculos")
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar que todos los documentos estén cargados
    if (!documentos.tarjeta_propiedad || !documentos.licencia_conducir || !documentos.soat) {
      alert("Debes subir todos los documentos requeridos");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuario no autenticado");

      // Subir archivos al storage
      const timestamp = Date.now();
      const tarjetaUrl = await uploadFile(
        documentos.tarjeta_propiedad,
        `${user.id}/tarjeta_propiedad_${timestamp}.${documentos.tarjeta_propiedad.name.split('.').pop()}`
      );
      const licenciaUrl = await uploadFile(
        documentos.licencia_conducir,
        `${user.id}/licencia_${timestamp}.${documentos.licencia_conducir.name.split('.').pop()}`
      );
      const soatUrl = await uploadFile(
        documentos.soat,
        `${user.id}/soat_${timestamp}.${documentos.soat.name.split('.').pop()}`
      );

      // Registrar vehículo en la base de datos
      const { error } = await supabase.from("vehiculos").insert({
        conductor_id: user.id,
        placa: formData.placa.toUpperCase(),
        marca: formData.marca,
        modelo: formData.modelo,
        color: formData.color,
        anio: parseInt(formData.anio),
        capacidad_pasajeros: parseInt(formData.capacidad_pasajeros),
        tarjeta_propiedad_url: tarjetaUrl,
        licencia_conducir_url: licenciaUrl,
        soat_url: soatUrl,
      });

      if (error) throw error;

      alert("¡Vehículo registrado exitosamente!");
      navigate("/home");
    } catch (error) {
      console.error("Error al registrar vehículo:", error);
      alert("Error al registrar el vehículo. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Registra tu Vehículo
          </h1>
          <p className="text-gray-600">
            Completa la información para comenzar a ofrecer viajes
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del vehículo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Placa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="placa"
                value={formData.placa}
                onChange={handleInputChange}
                placeholder="ABC123"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#f36d6d]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marca <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="marca"
                value={formData.marca}
                onChange={handleInputChange}
                placeholder="Toyota, Mazda, etc."
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#f36d6d]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Modelo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="modelo"
                value={formData.modelo}
                onChange={handleInputChange}
                placeholder="Corolla, Mazda 3, etc."
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#f36d6d]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Color <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                placeholder="Blanco, Negro, etc."
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#f36d6d]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Año <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="anio"
                value={formData.anio}
                onChange={handleInputChange}
                placeholder="2020"
                min="1990"
                max={new Date().getFullYear() + 1}
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#f36d6d]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capacidad de pasajeros
              </label>
              <input
                type="number"
                name="capacidad_pasajeros"
                value={formData.capacidad_pasajeros}
                onChange={handleInputChange}
                min="1"
                max="8"
                className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#f36d6d]"
                required
              />
            </div>
          </div>

          {/* Documentos requeridos */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Documentos Requeridos
            </h3>

            {/* Tarjeta de Propiedad */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tarjeta de Propiedad <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-[#f36d6d] transition">
                    <div className="flex items-center justify-center gap-2">
                      <FaUpload className="text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {documentos.tarjeta_propiedad
                          ? documentos.tarjeta_propiedad.name
                          : "Seleccionar archivo"}
                      </span>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, "tarjeta_propiedad")}
                    className="hidden"
                  />
                </label>
                {uploadStatus.tarjeta_propiedad ? (
                  <FaCheckCircle className="text-green-500 text-2xl" />
                ) : (
                  <FaTimesCircle className="text-gray-300 text-2xl" />
                )}
              </div>
            </div>

            {/* Licencia de Conducir */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Licencia de Conducir <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-[#f36d6d] transition">
                    <div className="flex items-center justify-center gap-2">
                      <FaUpload className="text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {documentos.licencia_conducir
                          ? documentos.licencia_conducir.name
                          : "Seleccionar archivo"}
                      </span>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, "licencia_conducir")}
                    className="hidden"
                  />
                </label>
                {uploadStatus.licencia_conducir ? (
                  <FaCheckCircle className="text-green-500 text-2xl" />
                ) : (
                  <FaTimesCircle className="text-gray-300 text-2xl" />
                )}
              </div>
            </div>

            {/* SOAT */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SOAT <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4">
                <label className="flex-1 cursor-pointer">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-[#f36d6d] transition">
                    <div className="flex items-center justify-center gap-2">
                      <FaUpload className="text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {documentos.soat ? documentos.soat.name : "Seleccionar archivo"}
                      </span>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => handleFileChange(e, "soat")}
                    className="hidden"
                  />
                </label>
                {uploadStatus.soat ? (
                  <FaCheckCircle className="text-green-500 text-2xl" />
                ) : (
                  <FaTimesCircle className="text-gray-300 text-2xl" />
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-semibold text-white transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#f36d6d] hover:bg-[#e65454]"
            }`}
          >
            {loading ? "Registrando..." : "Registrar Vehículo"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegistroConductor;