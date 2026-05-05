import { Navigate } from "react-router-dom"

export default function ProtectedRoute({ children, token }) {
    if (!token) {
        return <Navigate to ="/LogInPage" replace/>;
    }

    return children;
}