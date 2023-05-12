import java.io.FileWriter;
import java.io.IOException;  // Import the IOException class to handle errors

// This experiment demonstrates outputting additional information to a file
// and telling the system to gather the data from that file.

// There are two different ways to gather additional information from an experiment
//     - Trial's Extra File: Gathers the designated file that a run of the file generates and places in a zip to be uploaded when
//         the experiment completes
//     - Trial Result: Integrates the information from a 2 line csv of headers and values that the file run generates
//         and adds them to the result csv that is being uploaded

// How to tell if they worked
//     - Trial's Extra File: You can download a zip file that contains the different output files specified
//     - Trial Result: The result csv downloaded has been expanded with information from the specified file


// Example settings for a run that demonstrates this: (Any Fields not specified can be left blank or to whatever their default is)

// Info:
// Trial Result: AddNumResult.csv
// If you want a collection of each CSV this experiment runs:
//     Trial's Extra File: AddNumResult.csv
// Both can be used at the same time

// Parameters:
// x, 1, 1, 10, 1
// y, 1, 1, 10, 1

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
