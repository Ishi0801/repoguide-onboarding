import typer
from repoguide_indexer.index_repo import index_local_repo

app = typer.Typer(add_completion=False)

@app.command()
def index(path: str = "."):
    count = index_local_repo(path)
    typer.echo(f"Indexed {count} files from {path} (stub).")

if __name__ == "__main__":
    app()
