from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "LogicUp Backend is Running!"}

#123