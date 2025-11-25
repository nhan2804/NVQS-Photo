document.addEventListener("DOMContentLoaded", () => {
  const dropdownInput = document.getElementById("dropdownInput");
  const dropdownList = document.getElementById("dropdownList");
  const hiddenInput = document.getElementById("selectedPerson");
  const items = document.querySelectorAll(".dropdown-item");
  const form = document.getElementById("uploadForm");
  const result = document.getElementById("result");
  const existingImagesContainer = document.getElementById("existingImages");

  // Filter dropdown
  dropdownInput.addEventListener("input", () => {
    const filter = dropdownInput.value.toLowerCase();
    let hasVisible = false;
    items.forEach((item) => {
      if (item.textContent.toLowerCase().includes(filter)) {
        item.style.display = "block";
        hasVisible = true;
      } else {
        item.style.display = "none";
      }
    });
    dropdownList.style.display = hasVisible ? "block" : "none";
  });

  // Show dropdown on focus
  dropdownInput.addEventListener("focus", () => {
    dropdownList.style.display = "block";
  });

  // Select item
  items.forEach((item) => {
    item.addEventListener("click", () => {
      const id = item.getAttribute("data-id");
      const name = item.textContent.trim();
      const imagesData = item.getAttribute("data-images");
      
      dropdownInput.value = name;
      hiddenInput.value = id;
      dropdownList.style.display = "none";

      // Handle existing images
      existingImagesContainer.innerHTML = "";
      try {
        const images = JSON.parse(imagesData);
        if (images && images.length > 0) {
          result.textContent = "Có " + images.length + " ảnh";
          images.forEach(img => {
            const imgEl = document.createElement("img");
            imgEl.src = img.path;
            imgEl.style.width = "80px";
            imgEl.style.height = "80px";
            imgEl.style.objectFit = "cover";
            imgEl.style.borderRadius = "8px";
            imgEl.style.border = "1px solid #ddd";
            
            const link = document.createElement("a");
            link.href = img.path;
            link.target = "_blank";
            link.appendChild(imgEl);
            
            existingImagesContainer.appendChild(link);
          });
        } else {
          result.textContent = "Chưa có ảnh!";
        }
      } catch (e) {
        console.error("Error parsing images", e);
      }
    });
  });

  // Click outside to close
  document.addEventListener("click", (e) => {
    if (!dropdownInput.contains(e.target) && !dropdownList.contains(e.target)) {
      dropdownList.style.display = "none";
    }
  });

  // Handle Submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!hiddenInput.value) {
      alert("Bạn chưa chọn người!");
      return;
    }

    const formData = new FormData(form);

    try {
      const res = await fetch("/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      result.textContent = json.message;

      if (res.ok) {
        const selectedId = hiddenInput.value;
        const selectedItem = document.querySelector(`.dropdown-item[data-id="${selectedId}"]`);
        if (selectedItem) {
            let currentImages = JSON.parse(selectedItem.getAttribute("data-images") || "[]");
            const displayPath = json.filePath.replace("/public", "");
            currentImages.push({ path: displayPath, folder: formData.get("folder") || "default" });
            selectedItem.setAttribute("data-images", JSON.stringify(currentImages));
            
            const imgEl = document.createElement("img");
            imgEl.src = displayPath;
            imgEl.style.width = "80px";
            imgEl.style.height = "80px";
            imgEl.style.objectFit = "cover";
            imgEl.style.borderRadius = "8px";
            imgEl.style.border = "1px solid #ddd";
            
            const link = document.createElement("a");
            link.href = displayPath;
            link.target = "_blank";
            link.appendChild(imgEl);
            
            existingImagesContainer.appendChild(link);
        }
        
        form.reset();
        dropdownInput.value = "";
        hiddenInput.value = "";
        existingImagesContainer.innerHTML = "";
      }

    } catch (err) {
      console.error(err);
      result.textContent = "Có lỗi xảy ra!";
    }
  });
});
