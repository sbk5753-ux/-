document.getElementById("year").textContent = new Date().getFullYear();

const form = document.getElementById("subscribe-form");
const note = document.getElementById("subscribe-note");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = new FormData(form).get("email");
  // TODO: 실제 운영 시 Google Forms / Tally / 자체 백엔드 API로 교체하세요.
  console.log("subscribe request (not persisted):", email);
  note.textContent = "감사합니다! (데모 페이지라 실제로 저장되지는 않았어요 - site/README.md 참고)";
  form.reset();
});
