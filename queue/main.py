from fastapi import FastAPI
from worker import process_queue
from service import queue

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Valkey Queue API"}


@app.post("/task")
async def create_task(task:str):
    job = queue.enqueue(process_queue, task)
    return {"message": "Task created", "job_id": job.id}

@app.get('/result')
def get_result(id:str):
    job = queue.fetch_job(id)
    if job:
        return {"message": "Task processed", "result": job.result}
    else:
        return {"message": "Task not found"}
