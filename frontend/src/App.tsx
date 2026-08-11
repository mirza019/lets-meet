import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Confirmed } from "./pages/Confirmed";
import { GuestInvite } from "./pages/GuestInvite";
import { GuestReview } from "./pages/GuestReview";
import { History } from "./pages/History";
import { Home } from "./pages/Home";
import { MeetMode } from "./pages/MeetMode";
import { RoleReview } from "./pages/RoleReview";
import { Wizard } from "./pages/Wizard";
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/invite/:guestToken" element={<GuestInvite />} />
        <Route path="/invite/:guestToken/build" element={<Wizard />} />
        <Route path="/invite/:guestToken/review" element={<GuestReview />} />
        <Route
          path="/respond/:hostToken"
          element={<RoleReview role="host" />}
        />
        <Route
          path="/respond/:hostToken/review"
          element={<RoleReview role="host" />}
        />
        <Route
          path="/invite/:guestToken/confirmed"
          element={<Confirmed role="guest" />}
        />
        <Route
          path="/respond/:hostToken/confirmed"
          element={<Confirmed role="host" />}
        />
        <Route
          path="/invite/:guestToken/today"
          element={<MeetMode role="guest" />}
        />
        <Route
          path="/respond/:hostToken/today"
          element={<MeetMode role="host" />}
        />
        <Route
          path="/invite/:guestToken/history"
          element={<History role="guest" />}
        />
        <Route
          path="/respond/:hostToken/history"
          element={<History role="host" />}
        />
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
