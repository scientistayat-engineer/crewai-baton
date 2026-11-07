/* Scroll reveal for website sections */
(()=>{const els=document.querySelectorAll(".rv");if(!("IntersectionObserver" in window))return;document.documentElement.classList.add("js");
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{threshold:.12});els.forEach(e=>io.observe(e))})();
