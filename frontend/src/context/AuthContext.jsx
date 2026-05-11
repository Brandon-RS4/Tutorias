import { createContext, useState, useEffect, useContext } from 'react';
import api from '../api/axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Revisar si hay un usuario guardado al recargar la página
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');

        if (storedUser && storedToken) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser) setUser(parsedUser);
            } catch (e) {
                console.error("Failed to parse stored user", e);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
        setLoading(false);
    }, []);

    const login = async (correo, contrasena) => {
        try {
            // Ajusta la ruta '/auth/login' si tu backend la llamó diferente
            const response = await api.post('/auth/login', { correo, contrasena });
            const { token, data } = response.data;
            const usuario = data.usuario;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(usuario));
            setUser(usuario);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Error al iniciar sesión'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);