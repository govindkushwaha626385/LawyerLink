# Use an official lightweight Python image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Copy the requirements file
COPY requirements.txt .

# Install dependencies (using CPU-only PyTorch from requirements)
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on (HF Spaces uses 7860, Render uses 10000/Env)
EXPOSE 7860

# Command to run the application (Bind to 0.0.0.0 for external access)
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
