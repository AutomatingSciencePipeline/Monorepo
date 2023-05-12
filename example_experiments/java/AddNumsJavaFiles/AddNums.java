import java.io.FileWriter;
import java.io.IOException;  // Import the IOException class to handle errors

public class AddNums {
    public static void main(String[] args){
        String filename = args[0];
        PropParser.load(filename);
        int x = Integer.parseInt(PropParser.getProperty("x"));
        int y = Integer.parseInt(PropParser.getProperty("y"));
        try {
            FileWriter writer = new FileWriter("AddNumResult.csv");
            writer.write("Addition,Subtraction\n");
            writer.write(((x+y) + "," + (x-y)));
            writer.close();
            System.out.println("Successfully wrote to the file.");
        } catch (IOException e) {
            System.out.println("An error occurred.");
            e.printStackTrace();
        }
        System.out.println(x + y);
    }
}
