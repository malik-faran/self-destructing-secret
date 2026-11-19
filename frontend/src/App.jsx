import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import NotFound from "./pages/NotFound.jsx";
import Reveal from "./pages/Reveal.jsx";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/s/:secretId" element={<Reveal />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
