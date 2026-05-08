import { Navigate } from "react-router-dom"
//stops user from accessing the ar page while they dont have a access token
export default function ProtectedRoute({ children, token }) {
    if (!token) {
        return <Navigate to ="/LogInPage" replace/>;
    }

    return children;
}